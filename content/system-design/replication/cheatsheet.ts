import type { Lesson } from "@tintelix/schema";

export const replCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "Reads scale, writes don't",
    text: ["Single-leader replication: {readRps} reads a second over {replicas} replicas is {perReplicaReads} each, but all {writeRps} writes still pass through the primary. Only sharding adds write capacity."],
  },
  {
    heading: "Replication lag",
    text: ["Asynchronous replicas trail the primary ({lagMs} here). Reading your own write from one inside that window returns the old value. Fix: send those reads to the primary, or to a replica known to have caught up."],
  },
  {
    heading: "Failover and lost writes",
    text: ["A crashed primary takes its unreplicated writes with it: about writes a second × lag, {lostWrites} here. Synchronous replication loses none, but every write waits a round trip: {syncWriteMs} instead of {commitMs}."],
  },
  {
    heading: "Other shapes",
    text: ["Multi-leader: local writes in each region, with conflicts to resolve. Leaderless (Cassandra, Riak): write to W of N, read R, and W + R > N makes reads see the latest write."],
  },
];
