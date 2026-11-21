import { formatOutput } from "@tintelix/schema/format";
import { idemModel } from "./model";

const run = (extra: Record<string, number>) => idemModel.run({ ...idemModel.defaults, ...extra }) as Record<string, number>;
const show = (extra: Record<string, number>, name: string) => formatOutput(name, run(extra)[name]!);

describe("idempotency model", () => {
  it("retries after lost replies charge twice", () => {
    expect(show({}, "retries")).toBe("10");
    expect(show({}, "retryDoubles")).toBe("5");
    expect(show({}, "raceDoubles")).toBe("1");
    expect(show({}, "doubles")).toBe("6");
    expect(show({}, "doublesPerDay")).toBe("518,400");
  });

  it("an idempotency key stops retry doubles, but check-then-insert still races", () => {
    expect(show({ mode: 1 }, "retryDoubles")).toBe("0");
    expect(show({ mode: 1 }, "raceDoubles")).toBe("1");
    expect(show({ mode: 1 }, "keysStored")).toBe("86,400,000");
    expect(show({ mode: 1 }, "keyGb")).toBe("17");
  });

  it("claiming the key atomically stops the races too", () => {
    expect(show({ mode: 2 }, "doubles")).toBe("0");
  });
});
