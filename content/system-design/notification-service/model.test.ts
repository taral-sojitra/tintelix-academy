import { formatOutput } from "@tintelix/schema/format";
import { notifyModel } from "./model";

const run = (extra: Record<string, number> = {}) => notifyModel.run({ ...notifyModel.defaults, ...extra }) as Record<string, number>;
const show = (extra: Record<string, number>, name: string) => formatOutput(name, run(extra)[name]!);

describe("notification service model (book chapter 138's numbers)", () => {
  it("350 million events a day: 4,051 a second, 12,153 at peak", () => {
    expect(show({}, "triggerRate")).toBe("4,051");
    expect(show({}, "triggerPeak")).toBe("12,153");
  });

  it("a 15-million-user broadcast in 5 minutes needs 35,000 pushes, 12,500 emails, 2,500 SMS a second", () => {
    expect(show({}, "pushCount")).toBe("10,500,000");
    expect(show({}, "smsCount")).toBe("750,000");
    expect(show({}, "pushNeed")).toBe("35,000");
    expect(show({}, "emailNeed")).toBe("12,500");
    expect(show({}, "smsNeed")).toBe("2,500");
  });

  it("an SMS gateway capped at 300 a second takes 42 minutes and sends 12% on time", () => {
    expect(show({}, "smsDrainSec")).toBe("42 min");
    expect(show({}, "smsAtTargetPct")).toBe("12%");
    expect(show({ smsRate: 2500 }, "smsDrainSec")).toBe("5 min");
  });

  it("one shared queue holds push and email behind SMS; per-channel queues don't", () => {
    expect(show({ mode: 2 }, "pushEff")).toBe("4,200");
    expect(show({ mode: 2 }, "pushDoneSec")).toBe("42 min");
    expect(show({ mode: 2 }, "smsRejectPct")).toBe("88%");
    expect(show({ mode: 3 }, "pushEff")).toBe("35,000");
    expect(show({ mode: 3 }, "pushDoneSec")).toBe("5 min");
    expect(show({ mode: 3 }, "smsRejectPct")).toBe("0%");
  });

  it("dedup keys and audience resolution", () => {
    expect(show({ mode: 4 }, "keyStoreGb")).toBe("1.2");
    expect(show({ mode: 4 }, "dupDropPct")).toBe("100%");
    expect(show({ mode: 3 }, "dupDropPct")).toBe("0%");
    expect(show({ mode: 5 }, "resolveRate")).toBe("64,000");
    expect(show({ mode: 5 }, "resolveSec")).toBe("4 min");
    expect(show({ mode: 5, partitions: 16 }, "resolveSec")).toBe("8 min");
  });

  it("guards against nonsense inputs", () => {
    const out = run({ audience: -1, smsRate: 0, partitions: 0, smsPct: Number.NaN });
    for (const v of Object.values(out)) expect(Number.isFinite(v)).toBe(true);
  });
});
