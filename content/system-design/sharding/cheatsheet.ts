import type { Lesson } from "@tintelix/schema";

export const shardCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "Why shard",
    text: ["Replicas add read capacity; only sharding adds write capacity. {writes} writes a second at {nodeCap} per machine needs at least {needShards} shards."],
  },
  {
    heading: "Range, hash, directory",
    text: [
      "Range: neighbours together, range queries cheap, but a growing key (id, timestamp) puts every write on one shard. Hash: even keys, but range queries ask every shard. Directory: a lookup table that can place any key anywhere.",
    ],
  },
  {
    heading: "Hot keys",
    text: ["Hashing evens keys, not traffic. A key taking {hotPct} of writes overloads its shard; salting it into sub-keys spreads the load, and reads fan in across them."],
  },
];
