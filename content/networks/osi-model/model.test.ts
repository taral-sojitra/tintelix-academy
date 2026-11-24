import { formatOutput } from "@tintelix/schema/format";
import { osiModel } from "./model";

const run = (extra: Record<string, number> = {}) => osiModel.run({ ...osiModel.defaults, ...extra }) as Record<string, number>;
const show = (extra: Record<string, number>, name: string) => formatOutput(name, run(extra)[name]!);

describe("OSI model lesson model", () => {
  it("splits a 3,000-byte message into 1,460-byte segments and counts the headers", () => {
    const d = run();
    expect(d.mss).toBe(1460);
    expect(d.segments).toBe(3);
    expect(d.headerPerSeg).toBe(58);
    expect(d.headerBytes).toBe(174);
    expect(d.wireBytes).toBe(3174);
    expect(d.firstSegBytes).toBe(1460);
    expect(d.frameBytes).toBe(1518);
    expect(show({}, "overheadPct")).toBe("5.5%");
  });

  it("a tiny message pays the most for its headers", () => {
    const d = run({ payloadBytes: 100 });
    expect(d.segments).toBe(1);
    expect(d.frameBytes).toBe(158);
    expect(show({ payloadBytes: 100 }, "overheadPct")).toBe("37%");
    expect(show({ payloadBytes: 20000 }, "segments")).toBe("14");
    expect(show({ payloadBytes: 20000 }, "overheadPct")).toBe("3.9%");
  });

  it("starts a new segment one byte past the MSS", () => {
    expect(run({ payloadBytes: 1460 }).segments).toBe(1);
    expect(run({ payloadBytes: 1461 }).segments).toBe(2);
  });

  it("a bigger MTU means bigger segments", () => {
    const d = run({ mtu: 9000 });
    expect(d.mss).toBe(8960);
    expect(d.segments).toBe(1);
  });

  it("keeps bad inputs in range", () => {
    expect(run({ payloadBytes: Number.NaN }).segments).toBe(3);
    expect(run({ payloadBytes: -5 }).segments).toBe(1);
    expect(run({ mtu: 10 }).mss).toBe(536);
    expect(run({ mode: 99 }).mode).toBe(5);
  });

  it("tells the headers widget whether to wrap, show the frame or unwrap", () => {
    expect([0, 1, 2, 3, 4, 5].map((mode) => run({ mode }).wrap)).toEqual([0, 1, 2, 3, 2, 2]);
  });
});
