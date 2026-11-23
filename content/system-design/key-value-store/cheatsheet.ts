import type { Lesson } from "@tintelix/schema";

export const kvCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "Spread and copy",
    text: ["Consistent hashing puts each key on the next N nodes around a ring (N = {replicas} here, {nodes} nodes for {dataTb} TB). Any node can coordinate a request. One copy per key means a dead node takes its keys with it."],
  },
  {
    heading: "Quorums",
    text: ["A write waits for W replicas, a read asks R. W + R > N means every read overlaps the latest write. With W = {writeQuorum}, R = {readQuorum}: writes {writeLatencyMs}, reads {readLatencyMs}, {staleReadPct} stale reads. Smaller W or R is faster but can read stale data."],
  },
  {
    heading: "Staying writable",
    text: ["Sloppy quorum and hinted handoff: when a replica is down, write its copy to the next healthy node with a hint, and hand it back on recovery. Read repair and Merkle-tree anti-entropy fix replicas that drift; gossip spreads who is up."],
  },
  {
    heading: "Concurrent writes",
    text: ["Vector clocks hold one counter per writing node. If neither version is newer in every counter, they were concurrent: keep both as siblings and let the app merge (Dynamo, Riak). Last-write-wins (Cassandra) is simpler but can drop data."],
  },
];
