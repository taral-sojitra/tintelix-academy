import { formatOutput } from "@tintelix/schema/format";
import { methodModel } from "./model";

const run = (extra: Record<string, number> = {}) => methodModel.run({ ...methodModel.defaults, ...extra }) as Record<string, number>;
const show = (extra: Record<string, number>, name: string) => formatOutput(name, run(extra)[name]!);

describe("design method model (TV-show voting)", () => {
  it("estimates: 10 million votes in five minutes, double at peak, a gigabyte of storage", () => {
    expect(show({}, "votesM")).toBe("10");
    expect(show({}, "avgVoteRate")).toBe("33,333");
    expect(show({}, "peakVoteRate")).toBe("66,667");
    expect(show({}, "storageGb")).toBe("1");
  });

  it("a first design writes every vote to the database and drowns it", () => {
    expect(show({ mode: 1 }, "dbWriteRate")).toBe("66,667");
    expect(show({ mode: 1 }, "dbBusyPct")).toBe("1,333%");
    expect(show({ mode: 1 }, "dbFailPct")).toBe("93%");
    expect(show({ mode: 1 }, "votesLostPct")).toBe("93%");
  });

  it("a queue takes every vote and workers write them in batches", () => {
    expect(show({ mode: 2 }, "dbWriteRate")).toBe("667");
    expect(show({ mode: 2 }, "dbBusyPct")).toBe("13%");
    expect(show({ mode: 2 }, "votesLostPct")).toBe("0%");
    expect(show({ mode: 2, batchSize: 10 }, "dbBusyPct")).toBe("133%");
    expect(show({ mode: 2, batchSize: 10 }, "votesLostPct")).toBe("0%");
  });

  it("when the database dies the queue holds the votes", () => {
    expect(show({ mode: 3 }, "dbDown")).toBe("1");
    expect(show({ mode: 3 }, "dbWriteRate")).toBe("0");
    expect(show({ mode: 3 }, "dbBusyPct")).toBe("0%");
    expect(show({ mode: 3 }, "dbFailPct")).toBe("100%");
    expect(show({ mode: 3 }, "overloadPct")).toBe("0%");
    expect(show({ mode: 2, batchSize: 10 }, "overloadPct")).toBe("25%");
    expect(show({ mode: 3, elapsedSec: 10 }, "queueBacklog")).toBe("666,667");
    expect(show({ mode: 3 }, "votesLostPct")).toBe("0%");
    expect(show({ mode: 2 }, "queueBacklog")).toBe("0");
  });

  it("guards against nonsense inputs", () => {
    const out = run({ viewers: -1, windowSec: 0, batchSize: 0, dbWriteCapacity: Number.NaN });
    for (const v of Object.values(out)) expect(Number.isFinite(v)).toBe(true);
  });
});
