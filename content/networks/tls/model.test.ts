import { formatOutput } from "@tintelix/schema/format";
import { tlsModel } from "./model";

const run = (extra: Record<string, number> = {}) => tlsModel.run({ ...tlsModel.defaults, ...extra }) as Record<string, number>;
const show = (extra: Record<string, number>, name: string) => formatOutput(name, run(extra)[name]!);

describe("TLS model", () => {
  it("TLS 1.3 adds one round trip after TCP's: the first byte at 240 ms", () => {
    expect(show({}, "tls13FirstByteMs")).toBe("240 ms");
    expect(show({}, "tls12FirstByteMs")).toBe("320 ms");
    expect(show({}, "tls13SavedMs")).toBe("80 ms");
  });

  it("QUIC folds the handshakes together, and resuming saves another round trip", () => {
    expect(show({}, "quicFirstByteMs")).toBe("160 ms");
    expect(show({}, "resumedFirstByteMs")).toBe("160 ms");
    expect(show({}, "quicResumedMs")).toBe("80 ms");
  });

  it("scales with the round trip", () => {
    expect(show({ rttMs: 150 }, "tls12FirstByteMs")).toBe("600 ms");
  });

  it("certificates last at most 200 days now, 47 from 2029", () => {
    expect([run().certDays, run().certDays2029]).toEqual([200, 47]);
    expect(show({}, "renewalsPerYear")).toBe("1.8");
    expect(show({}, "renewals2029")).toBe("7.8");
  });

  it("tells the explainer which part of the story to show", () => {
    expect([0, 1, 2, 3, 4].map((mode) => run({ mode }).tlsStage)).toEqual([0, 1, 2, 3, 3]);
  });
});
