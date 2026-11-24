import type { SceneSpec } from "@tintelix/schema";

const ASK = { wire: "l_r", dir: 1 as const, at: "resolver" };

/**
 * DNS: the laptop asks its resolver; the resolver walks the root servers, the .com servers and
 * example.com's own name server (right), then answers. The website itself sits below the resolver.
 * Below that, the walk from the resolver's side and its cache.
 */
export const dnsScene: SceneSpec = {
  kind: "board",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 26, w: 984, h: 426 },
  nodes: {
    laptop: { x: 20, y: 56, w: 210, h: 76, kind: "users", label: "Laptop", sub: "wants a website" },
    resolver: { x: 330, y: 56, w: 220, h: 76, kind: "cache", label: "Resolver", sub: "e.g. 1.1.1.1" },
    root: { x: 760, y: 32, w: 220, h: 64, kind: "services", label: "Root servers", sub: "know who runs .com" },
    tld: { x: 760, y: 108, w: 220, h: 64, kind: "services", label: ".com servers", sub: "know example.com's" },
    auth: { x: 760, y: 184, w: 220, h: 64, kind: "db", label: "ns1.example.com", sub: "has the answer" },
    web: { x: 330, y: 172, w: 220, h: 70, kind: "origin", label: "www.example.com", sub: "203.0.113.80" },
    walk: { x: 20, y: 262, w: 960, h: 188, kind: "curve", label: "The lookup", sub: "from the resolver's side" },
  },
  wires: {
    l_r: { from: [230, 94], to: [330, 94] },
    r_root: { from: [550, 80], to: [760, 64] },
    r_tld: { from: [550, 94], to: [760, 140] },
    r_auth: { from: [550, 108], to: [760, 216] },
    l_w: { from: [180, 132], to: [330, 207] },
  },
  board: {
    legend: [["cyan", "question"], ["green", "answer"], ["amber", "visiting the site"]],
    flows: {
      ask: { from: "laptop", path: [ASK], color: "cyan", float: { at: "resolver", text: "www.example.com?", color: "cyan", chance: 1 } },
      root: { from: "resolver", path: [{ wire: "r_root", dir: 1, at: "root" }], color: "cyan", back: "green", float: { at: "root", text: "ask .com", color: "green", chance: 1 } },
      tld: { from: "resolver", path: [{ wire: "r_tld", dir: 1, at: "tld" }], color: "cyan", back: "green", float: { at: "tld", text: "ask ns1.example.com", color: "green", chance: 1 } },
      auth: { from: "resolver", path: [{ wire: "r_auth", dir: 1, at: "auth" }], color: "cyan", back: "green", float: { at: "auth", text: "203.0.113.80", color: "green", chance: 1 } },
      answer: { from: "resolver", path: [{ wire: "l_r", dir: -1, at: "laptop" }], color: "green", float: { at: "laptop", text: "203.0.113.80", color: "green", chance: 1 } },
      visit: { from: "laptop", path: [{ wire: "l_w", dir: 1, at: "web" }], color: "amber", back: "green" },
      hit: { from: "laptop", path: [ASK], color: "cyan", back: "green", float: { at: "resolver", text: "cached", color: "green", chance: 0.3 } },
      miss: { from: "resolver", path: [{ wire: "r_auth", dir: 1, at: "auth" }], color: "cyan", back: "green", float: { at: "auth", text: "TTL ran out", color: "amber", chance: 0.5 } },
    },
    modes: [
      {
        flows: [],
        tiles: [
          { id: "a", label: "You type", icon: "spark", hue: "violet", value: "A name", note: "www.example.com" },
          { id: "b", label: "Packets need", icon: "target", hue: "cyan", value: "An address", note: "203.0.113.80" },
          { id: "c", label: "Asked over", icon: "bolt", hue: "amber", value: "UDP port 53", note: "small and quick" },
        ],
      },
      {
        flows: ["ask", "root", "tld", "auth", "answer", "visit"].map((flow) => ({ flow, weight: 1 })),
        sequence: true,
        rate: 1,
        tiles: [
          { id: "a", label: "Servers asked", icon: "list", hue: "violet", value: "3", note: "root, .com, example.com's" },
          { id: "b", label: "Cold lookup", icon: "timer", hue: "amber", value: "{coldMs}", note: "before the page can load" },
          { id: "c", label: "Each knows", icon: "shuffle", hue: "cyan", value: "The next step", note: "not the whole answer" },
        ],
      },
      {
        flows: [{ flow: "hit", weight: 3 }, { flow: "visit", weight: 2 }],
        rate: 2,
        tiles: [
          { id: "a", label: "Answer lives", icon: "timer", hue: "violet", value: "{ttlSec} s", note: "its TTL" },
          { id: "b", label: "Cache hit", icon: "check", hue: "green", value: "{cachedMs}", note: "resolver answers at once", mood: "good" },
          { id: "c", label: "Usual miss", icon: "timer", hue: "amber", value: "{warmMs}", note: "root and .com still cached" },
        ],
      },
      {
        flows: [{ flow: "hit", weight: "hitPct" }, { flow: "miss", weight: "missPct" }, { flow: "visit", weight: 50 }],
        rate: 2.5,
        tiles: [
          { id: "a", label: "From the cache", icon: "check", hue: "green", value: "{hitPct}", note: "{missesPerHour} misses an hour" },
          { id: "b", label: "Average lookup", icon: "timer", hue: "cyan", value: "{avgMs}", note: "{lookupsPerHour} an hour" },
          { id: "c", label: "A change reaches all", icon: "alert", hue: "amber", value: "{changeMin} min", note: "worst case, one TTL" },
        ],
      },
    ],
    widgets: { walk: [{ kind: "custom", name: "dnswalk" }] },
  },
};
