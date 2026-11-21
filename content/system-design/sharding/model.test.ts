import { formatOutput } from "@tintelix/schema/format";
import { shardModel } from "./model";

const run = (extra: Record<string, number>) => shardModel.run({ ...shardModel.defaults, ...extra }) as Record<string, number>;
const show = (extra: Record<string, number>, name: string) => formatOutput(name, run(extra)[name]!);

describe("sharding model", () => {
  it("one primary can't take the writes", () => {
    expect(show({}, "hottestPct")).toBe("400%");
    expect(show({}, "servedPct")).toBe("25%");
    expect(run({}).needShards).toBe(4);
  });

  it("range by a growing id: every new write lands on the last shard", () => {
    const o = run({ scheme: 1 });
    expect(o.load4).toBe(20000);
    expect(o.load0).toBe(0);
    expect(show({ scheme: 1 }, "servedPct")).toBe("25%");
    expect(o.queryShards).toBe(1);
  });

  it("hash evens the shards, but range queries fan out to all of them", () => {
    const o = run({ scheme: 2 });
    expect(o.load0).toBe(4000);
    expect(show({ scheme: 2 }, "hottestPct")).toBe("80%");
    expect(show({ scheme: 2 }, "servedPct")).toBe("100%");
    expect(o.queryShards).toBe(5);
  });

  it("a hot key still burns one shard, until it is split across several", () => {
    const hot = { scheme: 2, hotPct: 30 };
    expect(show(hot, "hottestLoad")).toBe("8,800");
    expect(show(hot, "hottestPct")).toBe("176%");
    expect(show({ ...hot, split: 5 }, "hottestLoad")).toBe("4,000");
    expect(show({ ...hot, split: 10 }, "hottestLoad")).toBe("4,000");
  });
});
