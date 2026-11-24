import { formatOutput } from "@tintelix/schema/format";
import { handshakeModel } from "./model";

const run = (extra: Record<string, number> = {}) => handshakeModel.run({ ...handshakeModel.defaults, ...extra }) as Record<string, number>;
const show = (extra: Record<string, number>, name: string) => formatOutput(name, run(extra)[name]!);

describe("three-way handshake model", () => {
  it("connects after one round trip; the first byte arrives after two", () => {
    expect(show({}, "oneWayMs")).toBe("40 ms");
    expect(show({}, "handshakeMs")).toBe("80 ms");
    expect(show({}, "firstByteMs")).toBe("160 ms");
  });

  it("10 requests on new connections take 1,600 ms; on one connection 880 ms", () => {
    expect(run().newEachMs).toBe(1600);
    expect(run().reusedMs).toBe(880);
    expect(show({}, "savedPct")).toBe("45%");
    expect(run({ requests: 1 }).savedPct).toBe(0);
  });

  it("tells the ladder what to draw in each mode", () => {
    expect([0, 1, 2, 3, 4].map((mode) => run({ mode }).ladderStage)).toEqual([0, 1, 2, 3, 2]);
  });

  it("keeps bad inputs in range", () => {
    expect(run({ rttMs: 0 }).rttMs).toBe(1);
    expect(run({ requests: 0 }).requests).toBe(1);
    expect(run({ rttMs: Number.NaN }).rttMs).toBe(80);
  });
});
