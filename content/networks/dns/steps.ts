import type { Step } from "@tintelix/schema";

export const dnsSteps: Step[] = [
  {
    id: "names-and-numbers",
    tag: "problem",
    title: "Names for people, numbers for packets",
    short: "The problem",
    text: [
      "You type **www.example.com**. Every packet needs an IP address, here **203.0.113.80**. Something has to turn the name into the number, for billions of names that change every day, with no single computer that knows them all.",
      "That's **DNS**, the Domain Name System: a worldwide directory split across many servers, each in charge of its own part.",
    ],
    sim: { mode: "none", speed: 1 },
    model: { mode: 0 },
    live: "THE PROBLEM",
  },
  {
    id: "the-walk",
    tag: "technique",
    title: "Walk the tree from the top",
    short: "The walk",
    text: [
      "The laptop asks one server, its **resolver**, the one DHCP handed it. The question is small, so it goes over UDP port 53. The resolver does the legwork. It asks a **root server**, which doesn't know the address but knows who runs .com. It asks a **.com server**, which knows example.com's own name server. It asks **ns1.example.com**, which has the answer.",
      "Each level only knows the next step down: that's how the work is shared out. Done cold, the walk takes **{coldMs}** before the page can even start to load.",
    ],
    note: { kind: "idea", text: "There are 13 root server names, but over a thousand machines answer for them around the world, each reached at the nearest copy." },
    changed: [{ kind: "add", label: "Lookup", value: "root → .com → example.com" }],
    sim: { mode: "steady", speed: 1 },
    model: { mode: 1 },
    live: "LIVE · the walk",
  },
  {
    id: "cache",
    tag: "solution",
    title: "Remember answers for their TTL",
    short: "The cache",
    text: [
      "Every answer comes with a **TTL** (time to live): example.com's says **{ttlSec} s**. The resolver keeps it that long, so the next person to ask gets it in **{cachedMs}**. The root's and .com's answers have TTLs of days, so they're almost always cached; a usual miss only makes the last trip, **{warmMs}**.",
      "Your browser and operating system cache answers too, so most lookups never leave the laptop at all.",
    ],
    sim: { mode: "steady", speed: 1 },
    model: { mode: 2 },
    live: "LIVE · the cache",
  },
  {
    id: "ttl",
    tag: "technique",
    title: "TTL: fast or fresh",
    short: "Choosing a TTL",
    text: [
      "The resolver gets **{lookupsPerHour}** questions an hour for this name and misses about once per TTL: **{missesPerHour}** an hour, so **{hitPct}** are answered from the cache and the average lookup takes **{avgMs}**.",
      "The cost of a long TTL: when the site moves to a new address, resolvers keep handing out the old one until their copy expires, up to **{changeMin} minutes**. Teams lower the TTL a day before a planned move, then raise it again after.",
    ],
    note: { kind: "turn", text: "Drag the TTL down to 30 s: more misses, slower lookups, but changes spread in half a minute." },
    controls: ["ttlSec", "lookupsPerHour"],
    sim: { mode: "steady", speed: 1 },
    model: { mode: 3 },
    live: "LIVE · choosing a TTL",
  },
  {
    id: "recap",
    tag: "recap",
    title: "From a name to an address",
    short: "Recap",
    text: [
      "Your device asks a resolver; on a miss, the resolver walks the tree: root, then the top-level domain, then the site's own name server. Every answer carries a TTL, and every layer caches it. A long TTL makes lookups fast; a short one makes changes spread fast.",
    ],
    sim: { mode: "steady", speed: 1 },
    model: { mode: 1 },
    live: "RECAP",
  },
];
