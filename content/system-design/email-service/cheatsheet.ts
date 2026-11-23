import type { Lesson } from "@tintelix/schema";

export const emailCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "The numbers",
    text: ["{usersB} billion inboxes × {recvPerDay} a day = {recvRate} messages a second, {peakRecv} at peak. {totalPbYear} PB of new mail a year, {attachPbYear} PB of it attachments after duplicates."],
  },
  {
    heading: "Store and search",
    text: ["Shard whole mailboxes by user ID: {storageNodes} shards of {nodeTb} TB for a year, {writesPerShard} writes a second each. Attachments in object storage by hash. One search index per mailbox, filled from a queue after delivery."],
  },
  {
    heading: "Send safely",
    text: ["SPF, DKIM and DMARC on every sending domain. Suppress hard bounces for good ({hardBounces} from a {campaignSize} campaign with {deadPct} dead). Transactional mail on its own subdomain."],
  },
];
