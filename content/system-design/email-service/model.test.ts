import { formatOutput } from "@tintelix/schema/format";
import { emailModel } from "./model";

const run = (extra: Record<string, number> = {}) => emailModel.run({ ...emailModel.defaults, ...extra }) as Record<string, number>;
const show = (extra: Record<string, number>, name: string) => formatOutput(name, run(extra)[name]!);

describe("email service model", () => {
  it("a billion inboxes: 1.4 million messages a second at peak, about 3,000 PB of new mail a year", () => {
    expect(show({}, "recvRate")).toBe("694,444");
    expect(show({}, "peakRecv")).toBe("1,388,889");
    expect(show({}, "bodiesPbYear")).toBe("1,314");
    expect(show({}, "attachPbYear")).toBe("1,643");
    expect(show({}, "sendRate")).toBe("69,444");
  });

  it("one database is fine at launch and hopeless at full size", () => {
    expect(show({ mode: 1 }, "dbWrites")).toBe("139");
    expect(show({ mode: 2 }, "dbBusyPct")).toBe("2,778%");
    expect(show({ mode: 2 }, "dbFailPct")).toBe("96%");
  });

  it("sharded by user, storage sets the shard count, not traffic", () => {
    expect(show({ mode: 3 }, "storageNodes")).toBe("65,700");
    expect(show({ mode: 3 }, "writesPerShard")).toBe("21");
    expect(show({ mode: 3 }, "dbFailPct")).toBe("0%");
  });

  it("search and sending", () => {
    expect(show({}, "searchRate")).toBe("23,148");
    expect(show({}, "hardBounces")).toBe("30,000");
    expect(show({ deadPct: 2 }, "hardBounces")).toBe("10,000");
  });

  it("guards against nonsense inputs", () => {
    const out = run({ users: -1, dbCap: 0, nodeTb: 0, shardWrites: 0, deadPct: Number.NaN });
    for (const v of Object.values(out)) expect(Number.isFinite(v)).toBe(true);
  });
});
