import { formatOutput } from "@tintelix/schema/format";
import { txnModel } from "./model";

const run = (extra: Record<string, number>) => txnModel.run({ ...txnModel.defaults, ...extra }) as Record<string, number>;
const show = (extra: Record<string, number>, name: string) => formatOutput(name, run(extra)[name]!);

describe("distributed transactions model", () => {
  it("no coordination: a failure halfway leaves orders charged but not reserved", () => {
    expect(show({}, "brokenRate")).toBe("2");
    expect(show({}, "lockMs")).toBe("20 ms");
  });

  it("two-phase commit: all or nothing, but locks are held across two round trips", () => {
    expect(show({ mode: 1 }, "brokenRate")).toBe("0");
    expect(show({ mode: 1 }, "lockMs")).toBe("40 ms");
    expect(show({ mode: 1 }, "hotMax")).toBe("25");
    expect(show({ mode: 1 }, "hotDemand")).toBe("30");
    expect(show({ mode: 1 }, "hotTurnedAwayPct")).toBe("17%");
  });

  it("a coordinator that dies after prepare leaves the locks held", () => {
    expect(show({ mode: 2 }, "blockedOrders")).toBe("900");
    expect(show({ mode: 2 }, "recoverSec")).toBe("30 s");
  });

  it("a saga commits each step and undoes the done ones on failure", () => {
    expect(show({ mode: 3 }, "brokenRate")).toBe("0");
    expect(show({ mode: 3 }, "compRate")).toBe("2");
    expect(show({ mode: 3 }, "hotMax")).toBe("50");
    expect(show({ mode: 3 }, "hotTurnedAwayPct")).toBe("0%");
  });
});
