import { formatOutput } from "@tintelix/schema/format";
import { limiterModel } from "./model";

const run = (extra: Record<string, number> = {}) => limiterModel.run({ ...limiterModel.defaults, ...extra }) as Record<string, number>;
const show = (extra: Record<string, number>, name: string) => formatOutput(name, run(extra)[name]!);

describe("distributed rate limiter model", () => {
  it("600 a minute is 10 a second; a normal key never notices", () => {
    expect(show({}, "limitRate")).toBe("10");
    expect(show({ mode: 0 }, "clientRate")).toBe("5");
    expect(show({ mode: 0 }, "allowedRate")).toBe("5");
    expect(show({ mode: 0 }, "blockedPct")).toBe("0%");
  });

  it("twenty gateways counting alone let a key through at 15× its limit", () => {
    expect(show({ mode: 1 }, "clientRate")).toBe("150");
    expect(show({ mode: 1 }, "perServerSeen")).toBe("7.5");
    expect(show({ mode: 1 }, "gatewaySeenPct")).toBe("75%");
    expect(show({ mode: 1 }, "allowedRate")).toBe("150");
    expect(show({ mode: 1 }, "overLimitX")).toBe("15");
    expect(show({ mode: 1 }, "localCapRate")).toBe("200");
  });

  it("one shared counter enforces the limit but loads one store", () => {
    expect(show({ mode: 2 }, "allowedRate")).toBe("10");
    expect(show({ mode: 2 }, "blockedPct")).toBe("93%");
    expect(show({ mode: 2 }, "checkRate")).toBe("160,000");
    expect(show({ mode: 2 }, "redisBusyPct")).toBe("160%");
    expect(show({ mode: 2, redisShards: 4 }, "redisBusyPct")).toBe("160%");
  });

  it("sharding the counters spreads the checks", () => {
    expect(show({ mode: 3, redisShards: 4 }, "redisBusyPct")).toBe("40%");
    expect(show({ mode: 3, redisShards: 2 }, "redisBusyPct")).toBe("80%");
    expect(show({ mode: 3, redisShards: 1 }, "redisBusyPct")).toBe("160%");
  });

  it("a dead shard, failing open, leaves its keys unchecked", () => {
    expect(show({ mode: 4, redisShards: 4 }, "uncheckedPct")).toBe("25%");
    expect(show({ mode: 4, redisShards: 4 }, "shardDownPct")).toBe("100%");
    expect(show({ mode: 3 }, "shardDownPct")).toBe("0%");
  });

  it("guards against nonsense inputs", () => {
    const out = run({ limitPerMin: 0, servers: -2, redisShards: 0, abusiveRate: Number.NaN });
    for (const v of Object.values(out)) expect(Number.isFinite(v)).toBe(true);
  });
});
