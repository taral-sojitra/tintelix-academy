import type { Lesson } from "@tintelix/schema";

export const mqCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "The numbers",
    text: ["{msgRate} messages a second × {msgKb} KB = {ingressGBs} GB/s. {partitions} partitions on {brokers} brokers, {rf} copies each: {brokerBusyPct} busy. {retentionDays} days kept = {retainedPb} PB."],
  },
  {
    heading: "The log",
    text: ["A topic is an append-only log in partitions. Hash a key to pick the partition: order holds within a partition only. Reading deletes nothing; records stay until retention ends. Each partition has a leader and followers; wait for in-sync copies before acknowledging."],
  },
  {
    heading: "Consumers",
    text: ["Groups split partitions; separate groups each get everything and replay from their own offsets. More consumers than partitions sit idle. Commit after processing (duplicates possible), so handlers must be idempotent."],
  },
];
