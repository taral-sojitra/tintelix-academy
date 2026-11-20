import { fillOutputs, formatOutput } from "./format";

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

describe("fillOutputs", () => {
  it("replaces every {name} with its formatted value", () => {
    expect(fillOutputs("Reads fall to {dbReads} at {p95}", { dbReads: 1080, p95: 38.4 })).toBe("Reads fall to 1,080 at 38 ms");
  });
  it("leaves unknown names visible so they are easy to spot", () => {
    expect(fillOutputs("{nope}", {})).toBe("{nope}");
  });
});
