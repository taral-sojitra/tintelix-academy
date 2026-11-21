import { formatOutput } from "@tintelix/schema/format";
import { fanoutModel } from "./model";

const run = (extra: Record<string, number>) => fanoutModel.run({ ...fanoutModel.defaults, ...extra }) as Record<string, number>;
const show = (extra: Record<string, number>, name: string) => formatOutput(name, run(extra)[name]!);

describe("fan-out model", () => {
  it("push: every post is written into every follower's feed; a feed open is one read", () => {
    expect(show({}, "feedWrites")).toBe("1,500,000");
    expect(show({}, "writeLoadPct")).toBe("75%");
    expect(show({}, "lookups")).toBe("20,000");
  });

  it("a celebrity's post takes the spare capacity a while to deliver", () => {
    expect(show({ mode: 1 }, "deliverSec")).toBe("20 s");
    expect(show({ mode: 1, elapsedSec: 11 }, "deliveredPct")).toBe("50%");
    expect(show({ mode: 1 }, "deliveredPct")).toBe("100%");
  });

  it("pull: no fan-out, but each feed open fetches from everyone you follow", () => {
    expect(show({ mode: 2 }, "feedWrites")).toBe("0");
    expect(show({ mode: 2 }, "perOpen")).toBe("200");
    expect(show({ mode: 2 }, "lookups")).toBe("4,000,000");
  });

  it("hybrid: push normal posts, pull the few celebrities", () => {
    expect(show({ mode: 3 }, "perOpen")).toBe("6");
    expect(show({ mode: 3 }, "lookups")).toBe("120,000");
    expect(show({ mode: 3 }, "deliverSec")).toBe("0 s");
    expect(show({ mode: 3 }, "deliveredPct")).toBe("100%");
  });
});
