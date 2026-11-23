import type { SceneSpec } from "@tintelix/schema";

/**
 * The crawl loop: URLs wait on the left (a plain queue, later the per-site frontier), fetchers in the
 * middle reach out to sites on the right, the parser stores each page and sends its links back through
 * the URL-seen filter at the bottom.
 */
export const crawlerScene: SceneSpec = {
  kind: "board",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 28, w: 984, h: 418 },
  nodes: {
    queue: { x: 16, y: 126, w: 250, h: 182, kind: "services", label: "URL queue", sub: "first in, first out" },
    frontier: { x: 16, y: 126, w: 250, h: 182, kind: "services", label: "URL frontier", sub: "a queue per site", hidden: true },
    fetchers: { x: 330, y: 170, w: 200, h: 90, kind: "app", label: "Fetchers", sub: "download pages" },
    hot: { x: 630, y: 30, w: 200, h: 104, kind: "origin", label: "news.example", sub: "one busy site" },
    trap: { x: 630, y: 30, w: 200, h: 104, kind: "origin", label: "calendar.example", sub: "endless next months", hidden: true },
    web: { x: 630, y: 142, w: 200, h: 80, kind: "edge", label: "Other sites", sub: "millions of them" },
    parser: { x: 630, y: 232, w: 200, h: 80, kind: "app", label: "Parser", sub: "pull out links" },
    store: { x: 630, y: 346, w: 200, h: 84, kind: "db", label: "Page store", sub: "compressed HTML" },
    seen: { x: 330, y: 330, w: 210, h: 100, kind: "cache", label: "URL seen?", sub: "Bloom filter", hidden: true },
  },
  wires: {
    f_w: { from: [266, 215], to: [330, 215] },
    w_h: { from: [530, 198], to: [630, 82] },
    w_o: { from: [530, 212], to: [630, 182] },
    w_p: { from: [530, 226], to: [630, 272] },
    p_s: { from: [730, 312], to: [730, 346], straight: true },
    p_seen: { from: [630, 296], to: [540, 380] },
    s_f: { from: [330, 380], to: [141, 308] },
  },
  board: {
    legend: [["cyan", "fetch"], ["green", "page back"], ["red", "refused or dropped"], ["violet", "page stored"], ["amber", "new link"]],
    flows: {
      fetchHotQ: { from: "queue", path: [{ wire: "f_w", dir: 1, at: "fetchers" }, { wire: "w_h", dir: 1, at: "hot" }], color: "cyan", back: "green", fail: { at: "hot", share: "hotFailPct" } },
      fetchWebQ: { from: "queue", path: [{ wire: "f_w", dir: 1, at: "fetchers" }, { wire: "w_o", dir: 1, at: "web" }], color: "cyan", back: "green" },
      fetchHot: { from: "frontier", path: [{ wire: "f_w", dir: 1, at: "fetchers" }, { wire: "w_h", dir: 1, at: "hot" }], color: "cyan", back: "green", fail: { at: "hot", share: "hotFailPct" } },
      fetchWeb: { from: "frontier", path: [{ wire: "f_w", dir: 1, at: "fetchers" }, { wire: "w_o", dir: 1, at: "web" }], color: "cyan", back: "green" },
      trapFetch: {
        from: "frontier",
        path: [{ wire: "f_w", dir: 1, at: "fetchers" }, { wire: "w_h", dir: 1, at: "trap" }],
        color: "amber",
        back: "green",
        float: { at: "trap", text: "/2031/08 → /2031/09", color: "amber", chance: 0.25 },
      },
      toParse: { from: "fetchers", path: [{ wire: "w_p", dir: 1, at: "parser" }, { wire: "p_s", dir: 1, at: "store" }], color: "violet", small: true },
      newLinks: {
        from: "parser",
        path: [{ wire: "p_seen", dir: 1, at: "seen" }, { wire: "s_f", dir: 1, at: "frontier" }],
        color: "amber",
        small: true,
        fail: { at: "seen", share: "seenPct" },
      },
    },
    modes: [
      {
        flows: [{ flow: "fetchWebQ", weight: 2 }, { flow: "fetchHotQ", weight: 1 }, { flow: "toParse", weight: 1 }],
        rate: 5,
        tiles: [
          { id: "a", label: "Pages", icon: "learn", hue: "violet", value: "{pagesB} billion", note: "a month, each refetched monthly" },
          { id: "b", label: "Fetch rate", icon: "activity", hue: "cyan", value: "{pageRate}/s", note: "{fetchers} in flight at 500 ms each" },
          { id: "c", label: "Storage", icon: "db", hue: "amber", value: "{storageTb} TB", note: "a month, compressed" },
        ],
      },
      {
        flows: [{ flow: "fetchHotQ", weight: 3 }, { flow: "fetchWebQ", weight: 2 }, { flow: "toParse", weight: 1 }],
        rate: 6,
        tiles: [
          { id: "a", label: "To news.example", icon: "origin", hue: "amber", value: "{hotHostRate}/s", note: "it allows about 10", mood: "bad" },
          { id: "b", label: "Refused", icon: "alert", hue: "violet", value: "{hotFailPct}", note: "we look like an attack", mood: "bad" },
          { id: "c", label: "Fetch rate", icon: "activity", hue: "cyan", value: "{pageRate}/s", note: "the crawl as a whole" },
        ],
      },
      {
        flows: [{ flow: "fetchHot", weight: 0.4 }, { flow: "fetchWeb", weight: 3 }, { flow: "toParse", weight: 1 }],
        rate: 6,
        tiles: [
          { id: "a", label: "Per site", icon: "gauge", hue: "green", value: "{hotHostRate}/s", note: "at most, by its own queue", mood: "good" },
          { id: "b", label: "Sites at once", icon: "edge", hue: "cyan", value: "{hostsInParallel}", note: "to keep {fetchers} fetches busy" },
          { id: "c", label: "Refused", icon: "check", hue: "violet", value: "{hotFailPct}", note: "", mood: "good" },
        ],
      },
      {
        flows: [{ flow: "fetchHot", weight: 0.4 }, { flow: "fetchWeb", weight: 3 }, { flow: "toParse", weight: 1 }, { flow: "newLinks", weight: 2 }],
        rate: 7,
        tiles: [
          { id: "a", label: "Links found", icon: "list", hue: "amber", value: "{linkRate}/s", note: "{linksPerPage} a page" },
          { id: "b", label: "Already seen", icon: "check", hue: "violet", value: "{seenPct}", note: "dropped by the filter" },
          { id: "c", label: "Filter memory", icon: "db", hue: "cyan", value: "{bloomGb} GB", note: "vs {setGb} GB for an exact set" },
        ],
      },
      {
        flows: [{ flow: "trapFetch", weight: "trapDrawPct" }, { flow: "fetchWeb", weight: 60 }, { flow: "toParse", weight: 20 }, { flow: "newLinks", weight: 30 }],
        rate: 7,
        tiles: [
          { id: "a", label: "calendar.example", icon: "alert", hue: "amber", value: "a trap", note: "a next-month link on every page", mood: "bad" },
          { id: "b", label: "Pages kept from it", icon: "hourglass", hue: "violet", value: "{trapPages}", note: "its budget, then it waits" },
          { id: "c", label: "Other sites", icon: "check", hue: "green", value: "unaffected", note: "", mood: "good" },
        ],
      },
    ],
    widgets: {
      queue: [
        {
          kind: "log",
          lines: [
            { text: "news.example/world/1" },
            { text: "news.example/world/2" },
            { text: "news.example/sport/1" },
            { text: "news.example/sport/2" },
          ],
        },
      ],
      frontier: [{ kind: "custom", name: "frontier" }],
      hot: [{ kind: "text", text: "Refusing {hotFailPct} of our requests", when: { output: "hotFailPct", above: 0 } }],
      seen: [{ kind: "text", text: "{seenPct} of links already known" }],
      trap: [{ kind: "text", text: "Budget: {trapPages} pages a crawl" }],
    },
    states: [{ node: "hot", cls: "tx-hot", when: { output: "hotFailPct", above: 0 } }],
    subs: { fetchers: "{fetchers} fetches at once", store: "{storageTb} TB a month", seen: "Bloom filter, {bloomGb} GB" },
  },
};
