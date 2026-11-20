import { caching } from "../../../content/system-design/caching/lesson";
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
