import { formatOutput } from "@tintelix/schema";
import { cdnModel } from "./model";

const run = (inputs: Record<string, number> = {}) => cdnModel.run({ ...cdnModel.defaults, ...inputs });

describe("cdnModel", () => {
  it("with no edge, every page crosses the ocean four times", () => {
    const o = run();
    expect(o.rttOriginMs).toBeCloseTo(191.8, 1);
    expect(o.noEdgePageMs).toBeCloseTo(787.2, 1);
    expect(o.hitPageMs).toBeCloseTo(42, 1);
    expect(o.missPageMs).toBeCloseTo(251.8, 1);
    expect(o.pageMs).toBeCloseTo(787.2, 1);
    expect(o.p95).toBeCloseTo(787.2, 1);
    expect(o.edgeHitPct).toBe(0);
    expect(o.originReqs).toBe(6000);
    expect(o.staleSec).toBe(3600);
  });

  it("with an edge and a one-hour TTL, nearly every page is a hit", () => {
    const o = run({ edge: 1 });
    expect(o.edgeHitPct).toBeGreaterThan(99.98);
    expect(o.originReqs).toBeCloseTo(0.56, 2);
    expect(o.pageMs).toBeCloseTo(42, 1);
    expect(o.p95).toBeCloseTo(42, 1);
  });

  it("a one-minute TTL still keeps 99.4% of pages in Mumbai", () => {
    const o = run({ edge: 1, ttlSec: 60 });
    expect(o.edgeHitPct).toBeCloseTo(99.45, 1);
    expect(o.originReqs).toBeCloseTo(33.1, 1);
  });

  it("a one-second TTL misses a quarter of the time, so the slowest 5% are misses", () => {
    const o = run({ edge: 1, ttlSec: 1 });
    expect(o.edgeHitPct).toBeCloseTo(75, 1);
    expect(o.p95).toBeCloseTo(251.8, 1);
    expect(o.pageMs).toBeCloseTo(42, 1);
  });

  it("a mostly empty edge serves most pages from the origin", () => {
    expect(run({ edge: 1, filled: 0.3 }).pageMs).toBeCloseTo(251.8, 1);
  });

  it("a purge makes a change show in about a second", () => {
    expect(run({ purge: 1 }).staleSec).toBe(1);
  });

  it("round trips grow with distance", () => {
    expect(run({ originKm: 1000 }).rttOriginMs).toBeCloseTo(16.6, 1);
    expect(run({ originKm: 17000 }).rttOriginMs).toBeCloseTo(250.2, 1);
  });

  it("reads sensibly at the sliders' extremes", () => {
    expect(formatOutput("edgeHitPct", run({ edge: 1, ttlSec: 10 }).edgeHitPct!)).toBe("97%");
    expect(formatOutput("rttOriginMs", run({ originKm: 1000 }).rttOriginMs!)).toBe("17 ms");
    expect(formatOutput("rttOriginMs", run({ originKm: 17000 }).rttOriginMs!)).toBe("250 ms");
  });

  it("echoes its inputs so text can quote them", () => {
    const o = run();
    expect([o.traffic, o.pages, o.originKm, o.ttlSec, o.oldPrice, o.newPrice]).toEqual([6000, 2000, 13000, 3600, 999, 799]);
  });
});
