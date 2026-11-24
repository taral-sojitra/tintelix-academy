import { formatOutput } from "@tintelix/schema/format";
import { leaderboardModel } from "./model";

const run = (extra: Record<string, number> = {}) => leaderboardModel.run({ ...leaderboardModel.defaults, ...extra }) as Record<string, number>;
const show = (extra: Record<string, number>, name: string) => formatOutput(name, run(extra)[name]!);

describe("leaderboard model", () => {
  it("10 million players: 11,574 score updates and 17,361 rank checks a second at peak", () => {
    expect(show({}, "updatesPeak")).toBe("11,574");
    expect(show({}, "readsPeak")).toBe("17,361");
  });

  it("counting higher scores in SQL is instant at launch and hopeless at 10 million", () => {
    expect(show({ mode: 1 }, "rankMs")).toBe("0.5 ms");
    expect(show({ mode: 1 }, "dbBusyPct")).toBe("0.03%");
    expect(show({ mode: 2 }, "rankMs")).toBe("500 ms");
    expect(show({ mode: 2 }, "dbBusyPct")).toBe("27,127%");
  });

  it("a sorted set ranks in about 23 steps, 29% busy, in 1 GB", () => {
    expect(show({ mode: 3 }, "logSteps")).toBe("23");
    expect(show({ mode: 3 }, "boardBusyPct")).toBe("29%");
    expect(show({ mode: 3 }, "memGb")).toBe("1");
  });

  it("a 100-million-player board needs five shards split by score", () => {
    expect(show({ mode: 5, players: 100e6 }, "boardShards")).toBe("5");
    expect(show({ mode: 5, players: 100e6 }, "boardBusyPct")).toBe("58%");
    expect(show({ mode: 5, players: 100e6 }, "memGb")).toBe("10");
    expect(show({ mode: 5 }, "boardShards")).toBe("1");
  });

  it("guards against nonsense inputs", () => {
    const out = run({ players: -1, dbCores: 0, scanPerSec: 0, redisOps: 0, launchPct: Number.NaN });
    for (const v of Object.values(out)) expect(Number.isFinite(v)).toBe(true);
  });
});
