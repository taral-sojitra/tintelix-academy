import { caching } from "../../../content/system-design/caching/lesson";
import { cdn } from "../../../content/system-design/cdn/lesson";
import { fillOutputs, formatOutput } from "./format";

describe("formatOutput keeps Caching as it reads today", () => {
  // Recorded before the duration, near-100% and small-number rules. dbBusy is left out: it is an
  // internal fraction that Caching never shows (only dbBusyPct is quoted or tiled).
  const before = { traffic: "6,000", dbCapacity: "6,500", dbReads: "1,080", hitRatePct: "82%", dbBusyPct: "17%", p95: "38 ms" };
  const noCache = { traffic: "6,000", dbCapacity: "6,500", dbReads: "6,000", hitRatePct: "0%", dbBusyPct: "92%", p95: "180 ms" };
  const shown = (inputs: Record<string, number>) => {
    const out = caching.model.run({ ...caching.model.defaults, ...inputs });
    return Object.fromEntries(Object.entries(out).filter(([k]) => k !== "dbBusy").map(([k, v]) => [k, formatOutput(k, v)]));
  };
  it("keeps every Caching output exactly as it reads today", () => {
    for (const step of caching.steps) expect(shown(step.model ?? {})).toEqual(step.id === "drowning" ? noCache : before);
    expect(shown(caching.cheatsheetInputs ?? {})).toEqual(before);
  });
});

describe("formatOutput", () => {
  it("shows percentages for names ending in Pct", () => {
    expect(formatOutput("dbBusyPct", 92.3)).toBe("92%");
    expect(formatOutput("dbBusyPct", 1333.4)).toBe("1,333%");
  });
  it("shows milliseconds for p95 and names ending in Ms", () => {
    expect(formatOutput("p95", 179.9)).toBe("180 ms");
    expect(formatOutput("waitMs", 4.4)).toBe("4 ms");
  });
  it("keeps one decimal for small non-whole millisecond values", () => {
    expect(formatOutput("p95", 25.5)).toBe("25.5 ms");
  });
  it("groups thousands for plain numbers", () => {
    expect(formatOutput("dbReads", 1080.0000001)).toBe("1,080");
    expect(formatOutput("traffic", 6000)).toBe("6,000");
  });
});

describe("formatOutput for the CDN lesson", () => {
  it("shows names ending in Sec as durations", () => {
    expect(formatOutput("staleSec", 1)).toBe("1 s");
    expect(formatOutput("staleSec", 60)).toBe("60 s");
    expect(formatOutput("staleSec", 3600)).toBe("60 min");
    expect(formatOutput("ttlSec", 7200)).toBe("2 h");
  });
  it("never rounds a rate just under 100% up to 100%", () => {
    expect(formatOutput("edgeHitPct", 99.99)).toBe("99.9%");
    expect(formatOutput("edgeHitPct", 99.45)).toBe("99.4%");
    expect(formatOutput("edgeHitPct", 96.77)).toBe("97%");
    expect(formatOutput("edgeHitPct", 100)).toBe("100%");
    expect(formatOutput("hitRatePct", 99.04)).toBe("99%");
  });
  it("keeps one decimal for small numbers that aren't whole", () => {
    expect(formatOutput("originReqs", 0.56)).toBe("0.6");
    expect(formatOutput("originReqs", 9.96)).toBe("10");
    expect(formatOutput("originReqs", 0)).toBe("0");
  });
  it("shows names ending in Price in rupees", () => {
    expect(formatOutput("oldPrice", 999)).toBe("₹999");
    expect(formatOutput("newPrice", 1299)).toBe("₹1,299");
  });
});

describe("fillOutputs", () => {
  it("replaces every {name} with its formatted value", () => {
    expect(fillOutputs("Reads fall to {dbReads} at {p95}", { dbReads: 1080, p95: 38.4 })).toBe("Reads fall to 1,080 at 38 ms");
  });
  it("leaves unknown names visible so they are easy to spot", () => {
    expect(fillOutputs("{nope}", {})).toBe("{nope}");
  });
});

describe("formatOutput keeps CDN as it reads today", () => {
  // Recorded before the rule for percentages under 10.
  const recorded: Record<string, Record<string, string>> = {
  "far-away": {
    "trips": "4",
    "traffic": "6,000",
    "pages": "2,000",
    "originKm": "13,000",
    "ttlSec": "60 min",
    "oldPrice": "₹999",
    "newPrice": "₹799",
    "rttOriginMs": "192 ms",
    "rttEdgeMs": "10 ms",
    "noEdgePageMs": "787 ms",
    "hitPageMs": "42 ms",
    "missPageMs": "252 ms",
    "perPageRate": "3",
    "edgeHitPct": "0%",
    "originReqs": "6,000",
    "pageMs": "787 ms",
    "p95": "787 ms",
    "staleSec": "60 min"
  },
  "add-edge": {
    "trips": "4",
    "traffic": "6,000",
    "pages": "2,000",
    "originKm": "13,000",
    "ttlSec": "60 min",
    "oldPrice": "₹999",
    "newPrice": "₹799",
    "rttOriginMs": "192 ms",
    "rttEdgeMs": "10 ms",
    "noEdgePageMs": "787 ms",
    "hitPageMs": "42 ms",
    "missPageMs": "252 ms",
    "perPageRate": "3",
    "edgeHitPct": "99.9%",
    "originReqs": "0.6",
    "pageMs": "42 ms",
    "p95": "42 ms",
    "staleSec": "60 min"
  },
  "slow-mo": {
    "trips": "4",
    "traffic": "6,000",
    "pages": "2,000",
    "originKm": "13,000",
    "ttlSec": "60 min",
    "oldPrice": "₹999",
    "newPrice": "₹799",
    "rttOriginMs": "192 ms",
    "rttEdgeMs": "10 ms",
    "noEdgePageMs": "787 ms",
    "hitPageMs": "42 ms",
    "missPageMs": "252 ms",
    "perPageRate": "3",
    "edgeHitPct": "90%",
    "originReqs": "600",
    "pageMs": "42 ms",
    "p95": "252 ms",
    "staleSec": "60 min"
  },
  "old-price": {
    "trips": "4",
    "traffic": "6,000",
    "pages": "2,000",
    "originKm": "13,000",
    "ttlSec": "60 min",
    "oldPrice": "₹999",
    "newPrice": "₹799",
    "rttOriginMs": "192 ms",
    "rttEdgeMs": "10 ms",
    "noEdgePageMs": "787 ms",
    "hitPageMs": "42 ms",
    "missPageMs": "252 ms",
    "perPageRate": "3",
    "edgeHitPct": "99.9%",
    "originReqs": "0.6",
    "pageMs": "42 ms",
    "p95": "42 ms",
    "staleSec": "60 min"
  },
  "purge": {
    "trips": "4",
    "traffic": "6,000",
    "pages": "2,000",
    "originKm": "13,000",
    "ttlSec": "60 s",
    "oldPrice": "₹999",
    "newPrice": "₹799",
    "rttOriginMs": "192 ms",
    "rttEdgeMs": "10 ms",
    "noEdgePageMs": "787 ms",
    "hitPageMs": "42 ms",
    "missPageMs": "252 ms",
    "perPageRate": "3",
    "edgeHitPct": "99.4%",
    "originReqs": "33",
    "pageMs": "42 ms",
    "p95": "42 ms",
    "staleSec": "1 s"
  },
  "recap": {
    "trips": "4",
    "traffic": "6,000",
    "pages": "2,000",
    "originKm": "13,000",
    "ttlSec": "60 s",
    "oldPrice": "₹999",
    "newPrice": "₹799",
    "rttOriginMs": "192 ms",
    "rttEdgeMs": "10 ms",
    "noEdgePageMs": "787 ms",
    "hitPageMs": "42 ms",
    "missPageMs": "252 ms",
    "perPageRate": "3",
    "edgeHitPct": "99.4%",
    "originReqs": "33",
    "pageMs": "42 ms",
    "p95": "42 ms",
    "staleSec": "1 s"
  },
  "cheatsheet": {
    "trips": "4",
    "traffic": "6,000",
    "pages": "2,000",
    "originKm": "13,000",
    "ttlSec": "60 s",
    "oldPrice": "₹999",
    "newPrice": "₹799",
    "rttOriginMs": "192 ms",
    "rttEdgeMs": "10 ms",
    "noEdgePageMs": "787 ms",
    "hitPageMs": "42 ms",
    "missPageMs": "252 ms",
    "perPageRate": "3",
    "edgeHitPct": "99.4%",
    "originReqs": "33",
    "pageMs": "42 ms",
    "p95": "42 ms",
    "staleSec": "1 s"
  }
};
  const shown = (inputs: Record<string, number>) =>
    Object.fromEntries(Object.entries(cdn.model.run({ ...cdn.model.defaults, ...inputs })).map(([k, v]) => [k, formatOutput(k, v)]));
  it("keeps every CDN output exactly as it reads today", () => {
    for (const step of cdn.steps) expect(shown(step.model ?? {})).toEqual(recorded[step.id]);
    expect(shown(cdn.cheatsheetInputs ?? {})).toEqual(recorded.cheatsheet);
  });
});

describe("formatOutput for the latency lesson", () => {
  it("keeps one decimal for percentages under 10 that aren't whole", () => {
    expect(formatOutput("pageSlowPct", 9.5618)).toBe("9.6%");
    expect(formatOutput("slowPct", 0.5)).toBe("0.5%");
    expect(formatOutput("pageSlowPct", 0.09996)).toBe("0.1%");
    expect(formatOutput("slowPct", 1)).toBe("1%");
    expect(formatOutput("pageSlowPct", 63.397)).toBe("63%");
    expect(formatOutput("slowPct", 9.96)).toBe("10%");
  });
});

describe("formatOutput for the availability lesson", () => {
  it("shows availability down to its first non-nine digit, never rounding up", () => {
    expect(formatOutput("pathAvail", 99.501)).toBe("99.5%");
    expect(formatOutput("perAvail", 99.9)).toBe("99.9%");
    expect(formatOutput("tierAvail", 99.95)).toBe("99.95%");
    expect(formatOutput("tierAvail", 99.9499)).toBe("99.94%");
    expect(formatOutput("pathAvail", 99.999500001)).toBe("99.9995%");
    expect(formatOutput("pathAvail", 99.99)).toBe("99.99%");
    expect(formatOutput("pathAvail", 99)).toBe("99%");
    expect(formatOutput("pathAvail", 98.5)).toBe("98.5%");
    expect(formatOutput("pathAvail", 100)).toBe("100%");
  });

  it("reads downtime in seconds, minutes, hours and minutes, or days", () => {
    expect(formatOutput("pathDowntime", 13.1)).toBe("13 s");
    expect(formatOutput("perDowntime", 2629.8)).toBe("43.8 min");
    expect(formatOutput("perDowntime", 1560)).toBe("26 min");
    expect(formatOutput("pathDowntime", 13122.7)).toBe("3 h 39 min");
    expect(formatOutput("pathDowntime", 7200)).toBe("2 h");
    expect(formatOutput("pathDowntime", 3.65 * 86400)).toBe("3.7 days");
  });

  it("keeps two decimals for shares under 1%", () => {
    expect(formatOutput("sharedPct", 0.05)).toBe("0.05%");
    expect(formatOutput("sharedPct", 0.1)).toBe("0.1%");
    expect(formatOutput("pageSlowPct", 0.09996)).toBe("0.1%");
  });
});
