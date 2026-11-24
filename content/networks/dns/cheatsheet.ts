import type { Lesson } from "@tintelix/schema";

export const dnsCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "The walk",
    text: ["Device → resolver → root (who runs .com?) → .com (who runs example.com?) → example.com's name server (the answer). Cold: {coldMs}; usual miss: {warmMs}; cached: {cachedMs}. UDP port 53, TCP for big answers."],
  },
  {
    heading: "Records",
    text: ["A: IPv4 address. AAAA: IPv6. CNAME: an alias for another name. MX: mail servers. NS: a zone's name servers. TXT: free text, used for checks like domain ownership."],
  },
  {
    heading: "TTL",
    text: ["How long anyone may cache an answer. {ttlSec} s with {lookupsPerHour} lookups an hour: {hitPct} cached, {avgMs} average, changes reach everyone within {changeMin} min. Lower it before moving a site."],
  },
];
