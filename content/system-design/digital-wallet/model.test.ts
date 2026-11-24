import { formatOutput } from "@tintelix/schema/format";
import { walletModel } from "./model";

const run = (extra: Record<string, number> = {}) => walletModel.run({ ...walletModel.defaults, ...extra }) as Record<string, number>;
const show = (extra: Record<string, number>, name: string) => formatOutput(name, run(extra)[name]!);

describe("digital wallet model", () => {
  it("one database: fine at launch, 1,000% at 50,000 transfers a second", () => {
    expect(show({ mode: 1 }, "dbTransfers")).toBe("250");
    expect(show({ mode: 1 }, "dbBusyPct")).toBe("5%");
    expect(show({ mode: 2 }, "dbBusyPct")).toBe("1,000%");
    expect(show({ mode: 2 }, "dbFailPct")).toBe("90%");
  });

  it("sharded by wallet: 50% a shard, and 95% of transfers cross shards", () => {
    expect(show({ mode: 3 }, "shardBusyPct")).toBe("50%");
    expect(show({ mode: 3 }, "crossShardPct")).toBe("95%");
    expect(show({ mode: 3, shards: 40 }, "shardBusyPct")).toBe("25%");
    expect(show({ mode: 3, shards: 1 }, "crossShardPct")).toBe("0%");
  });

  it("the event log: 2.9 billion events and 576 GB a day", () => {
    expect(show({}, "eventsB")).toBe("2.9");
    expect(show({}, "logGbDay")).toBe("576");
  });

  it("guards against nonsense inputs", () => {
    const out = run({ wallets: -1, dbCap: 0, shards: 0, shardOps: 0, peakTransfers: Number.NaN });
    for (const v of Object.values(out)) expect(Number.isFinite(v)).toBe(true);
  });
});
