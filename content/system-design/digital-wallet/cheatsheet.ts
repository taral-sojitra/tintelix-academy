import type { Lesson } from "@tintelix/schema";

export const walletCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "The numbers",
    text: ["{walletsM} million wallets, {peakTransfers} transfers a second at peak. One database: {dbCap} a second. {shards} shards by wallet ID: {shardBusyPct} busy each; {crossShardPct} of transfers cross shards."],
  },
  {
    heading: "Transfers",
    text: ["Same shard: one transaction. Across shards: a saga (reserve on the sender, credit the receiver, settle; release on failure). Transfer IDs make retries safe."],
  },
  {
    heading: "Event sourcing",
    text: ["Append every step to an ordered, unchangeable event log ({eventsB} billion events, {logGbDay} GB a day). Balances are derived; rebuild from snapshot + events; replay to fix bugs. Reads from a view; audit that balances add up."],
  },
];
