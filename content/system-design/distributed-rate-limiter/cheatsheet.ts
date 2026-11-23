import type { Lesson } from "@tintelix/schema";

export const limiterCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "The trap",
    text: ["A limit counted on each instance multiplies by the number of instances: {limitRate} a second on each of {servers} gateways lets one key through at up to {localCapRate} a second."],
  },
  {
    heading: "The shared counter",
    text: ["Redis INCR on a per-key, per-window counter, with an expiry set when it's created, run atomically in a Lua script (or a GCRA module such as redis-cell). One round trip per request; {checkRate} checks a second. Shard counters by key: with {redisShards} shards each is {redisBusyPct} busy."],
  },
  {
    heading: "Failure and contract",
    text: ["If the counter store is down, fail open for ordinary APIs and fail closed for logins and payouts. Refuse with 429 and Retry-After; send X-RateLimit-Limit, -Remaining and -Reset on every response."],
  },
];
