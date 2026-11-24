import { formatOutput } from "@tintelix/schema/format";
import { arpModel } from "./model";

const run = (extra: Record<string, number> = {}) => arpModel.run({ ...arpModel.defaults, ...extra }) as Record<string, number>;
const show = (extra: Record<string, number>, name: string) => formatOutput(name, run(extra)[name]!);

describe("ARP model", () => {
  it("one question reaches all 19 other devices and gets one answer", () => {
    const d = run();
    expect(d.devices).toBe(20);
    expect(d.askedDevices).toBe(19);
    expect(d.framesPerArp).toBe(20);
  });

  it("without a cache, 600 packets a minute ring 11,400 doorbells; with one, 19", () => {
    expect(show({}, "noiseNoCache")).toBe("11,400");
    expect(show({}, "noiseCached")).toBe("19");
    expect(show({}, "savedPct")).toBe("99.8%");
    expect(show({ cacheSec: 15 }, "noiseCached")).toBe("76");
  });

  it("tells the widget what to show in each mode", () => {
    expect([0, 1, 2, 3].map((mode) => run({ mode }).arpStage)).toEqual([0, 1, 2, 1]);
  });

  it("keeps bad inputs in range", () => {
    expect(run({ devices: 1 }).devices).toBe(2);
    expect(run({ cacheSec: 0 }).cacheSec).toBe(5);
    expect(run({ devices: Number.NaN }).devices).toBe(20);
  });
});
