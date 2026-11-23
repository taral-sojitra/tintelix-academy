import { formatOutput } from "@tintelix/schema/format";
import { friendsModel } from "./model";

const run = (extra: Record<string, number> = {}) => friendsModel.run({ ...friendsModel.defaults, ...extra }) as Record<string, number>;
const show = (extra: Record<string, number>, name: string) => formatOutput(name, run(extra)[name]!);

describe("nearby friends model", () => {
  it("40 million people sharing every 20 seconds: 2 million updates a second", () => {
    expect(show({}, "sharersM")).toBe("40");
    expect(show({}, "updateRateM")).toBe("2");
    expect(show({}, "activeFriends")).toBe("30");
  });

  it("polling every friend's location from a database falls over", () => {
    expect(show({ mode: 1 }, "dbReads")).toBe("300,000");
    expect(show({ mode: 1 }, "dbBusyPct")).toBe("30%");
    expect(show({ mode: 2 }, "dbBusyPct")).toBe("30,000%");
    expect(show({ mode: 2 }, "dbFailPct")).toBe("99.6%");
  });

  it("pub/sub: each update fans out to sharing friends, a tenth of them close enough", () => {
    expect(show({ mode: 3 }, "fanoutM")).toBe("60");
    expect(show({ mode: 3 }, "forwardedM")).toBe("6");
    expect(show({ mode: 3 }, "pubsubNodes")).toBe("60");
    expect(show({ mode: 3, updateEvery: 10 }, "fanoutM")).toBe("120");
    expect(show({ mode: 3, updateEvery: 60 }, "updateRateM")).toBe("0.7");
    expect(show({ mode: 3 }, "dbBusyPct")).toBe("0%");
  });

  it("the latest locations fit in a small cache", () => {
    expect(show({ mode: 4 }, "cacheGb")).toBe("2.6");
  });

  it("guards against nonsense inputs", () => {
    const out = run({ sharers: -1, updateEvery: 0, nodeRate: 0, friendsEach: Number.NaN });
    for (const v of Object.values(out)) expect(Number.isFinite(v)).toBe(true);
  });
});
