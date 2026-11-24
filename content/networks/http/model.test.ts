import { formatOutput } from "@tintelix/schema/format";
import { httpModel } from "./model";

const run = (extra: Record<string, number> = {}) => httpModel.run({ ...httpModel.defaults, ...extra }) as Record<string, number>;
const show = (extra: Record<string, number>, name: string) => formatOutput(name, run(extra)[name]!);

describe("HTTP model", () => {
  it("HTTP/1.1 fetches 30 files over 6 connections in 5 rounds: 10 round trips, 800 ms", () => {
    const d = run();
    expect(d.h1Rounds).toBe(5);
    expect([d.h1Setup, d.h1Html, d.h1Res]).toEqual([2, 1, 7]);
    expect(show({}, "h1Ms")).toBe("800 ms");
  });

  it("HTTP/2 sends all 30 at once on one connection: 320 ms", () => {
    expect([run().h2Setup, run().h2Html, run().h2Res]).toEqual([2, 1, 1]);
    expect(show({}, "h2Ms")).toBe("320 ms");
    expect(show({}, "h2SavedPct")).toBe("60%");
  });

  it("HTTP/3 connects and encrypts in one round trip: 240 ms", () => {
    expect(run().h3Setup).toBe(1);
    expect(show({}, "h3Ms")).toBe("240 ms");
    expect(show({}, "h3SavedPct")).toBe("70%");
  });

  it("the gap grows with more files and longer round trips", () => {
    expect(show({ resources: 90, rttMs: 150 }, "h1Ms")).toBe("3000 ms");
    expect(show({ resources: 90, rttMs: 150 }, "h2Ms")).toBe("600 ms");
    expect(run({ resources: 1 }).h1Res).toBe(1);
  });

  it("turns the later lanes on as the lesson reaches them", () => {
    expect([0, 1, 2, 3, 4].map((mode) => [run({ mode }).h2On, run({ mode }).h3On])).toEqual([[0, 0], [0, 0], [100, 0], [100, 100], [100, 100]]);
  });
});
