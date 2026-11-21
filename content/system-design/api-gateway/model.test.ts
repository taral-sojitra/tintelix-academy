import { formatOutput } from "@tintelix/schema/format";
import { gatewayModel } from "./model";

const run = (extra: Record<string, number>) => gatewayModel.run({ ...gatewayModel.defaults, ...extra }) as Record<string, number>;
const show = (extra: Record<string, number>, name: string) => formatOutput(name, run(extra)[name]!);

describe("API gateway model", () => {
  it("without a gateway, every service guards its own door", () => {
    expect(show({}, "authCopies")).toBe("6");
    expect(show({}, "addresses")).toBe("6");
    expect(show({}, "screenMs")).toBe("240 ms");
  });

  it("a gateway: one copy of the sign-in check, for 2 ms a request", () => {
    expect(show({ mode: 1 }, "authCopies")).toBe("1");
    expect(show({ mode: 1 }, "addresses")).toBe("1");
    expect(show({ mode: 1 }, "screenMs")).toBe("244 ms");
  });

  it("aggregation: one call from the phone, the rounds happen inside", () => {
    expect(show({ mode: 2 }, "screenMs")).toBe("144 ms");
    expect(show({ mode: 2, rttMs: 300 }, "screenMs")).toBe("344 ms");
  });

  it("the gateway is in every request, so it runs as a fleet with a spare", () => {
    expect(show({}, "gatewayInstances")).toBe("6");
  });
});
