import { formatOutput } from "@tintelix/schema/format";
import { feedModel } from "./model";

const run = (extra: Record<string, number> = {}) => feedModel.run({ ...feedModel.defaults, ...extra }) as Record<string, number>;
const show = (extra: Record<string, number>, name: string) => formatOutput(name, run(extra)[name]!);

describe("photo feed model (book chapter 129's numbers)", () => {
  it("500 million people, 5 feed loads each: 28,935 a second against 29 posts", () => {
    expect(show({}, "feedRate")).toBe("28,935");
    expect(show({}, "feedPeak")).toBe("57,870");
    expect(show({}, "postRate")).toBe("29");
    expect(show({}, "readWriteRatio")).toBe("1,000");
    expect(show({}, "mediaPbYear")).toBe("8.2");
  });

  it("pulling every followed account on each load is fine at launch and swamps the posts store at scale", () => {
    expect(show({ mode: 1 }, "dbBusyPct")).toBe("12%");
    expect(show({ mode: 2 }, "dbBusyPct")).toBe("1,157%");
    expect(show({ mode: 2 }, "dbFailPct")).toBe("91%");
  });

  it("pushing each post into followers' feeds is cheap for ordinary accounts", () => {
    expect(show({ mode: 3 }, "fanWrites")).toBe("8,681");
    expect(show({ mode: 3 }, "fanBusyPct")).toBe("4.3%");
    expect(show({ mode: 3 }, "dbBusyPct")).toBe("0%");
  });

  it("one post from an 80-million-follower account takes minutes to push", () => {
    expect(show({ mode: 4 }, "celebDrainSec")).toBe("7 min");
    expect(show({ mode: 4, celebFollowers: 1e6 }, "celebDrainSec")).toBe("5 s");
  });

  it("the hybrid pulls only the few big accounts at read time", () => {
    expect(show({ mode: 5 }, "mergeRate")).toBe("173,611");
    expect(show({ mode: 5 }, "dbBusyPct")).toBe("17%");
    expect(show({ mode: 5 }, "maxFanSec")).toBe("5 s");
  });

  it("guards against nonsense inputs", () => {
    const out = run({ dau: -1, follows: Number.NaN, fanoutCapacity: 0, threshold: 0 });
    for (const v of Object.values(out)) expect(Number.isFinite(v)).toBe(true);
  });
});
