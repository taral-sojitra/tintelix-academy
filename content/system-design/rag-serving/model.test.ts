import { formatOutput } from "@tintelix/schema/format";
import { ragModel } from "./model";

const run = (extra: Record<string, number> = {}) => ragModel.run({ ...ragModel.defaults, ...extra }) as Record<string, number>;
const show = (extra: Record<string, number>, name: string) => formatOutput(name, run(extra)[name]!);

describe("RAG and model serving model (book chapter 141's numbers)", () => {
  it("6 million passages in 36.9 GB of vectors; about 14 questions a second", () => {
    expect(show({}, "chunks")).toBe("6,000,000");
    expect(show({}, "vectorGb")).toBe("37");
    expect(show({}, "qps")).toBe("14");
    expect(show({}, "inFlight")).toBe("42");
  });

  it("one GPU taking one request at a time: fine at launch, hopeless at peak", () => {
    expect(show({ mode: 1 }, "gpuBusyPct")).toBe("42%");
    expect(show({ mode: 2 }, "gpuBusyPct")).toBe("4,167%");
    expect(show({ mode: 2 }, "unbatchedGpus")).toBe("42");
  });

  it("batching 20 generations a GPU needs 3 GPUs", () => {
    expect(show({ mode: 3 }, "gpusNeeded")).toBe("3");
    expect(show({ mode: 3 }, "gpuBusyPct")).toBe("69%");
    expect(show({ mode: 3, perGpu: 5 }, "gpusNeeded")).toBe("9");
  });

  it("re-embedding at 200 a second: 10,000 changes in 50 s, 500,000 in about 42 minutes", () => {
    expect(show({ changedDocs: 10_000 }, "staleSec")).toBe("50 s");
    expect(show({}, "staleSec")).toBe("42 min");
  });

  it("a cache for repeated questions takes load off the GPUs", () => {
    expect(show({ mode: 5 }, "gpuBusyPct")).toBe("56%");
    expect(show({ mode: 4 }, "cacheHitPct")).toBe("0%");
  });

  it("guards against nonsense inputs", () => {
    const out = run({ docs: -1, perGpu: 0, embedRate: 0, genSec: Number.NaN, queriesPerHour: -5 });
    for (const v of Object.values(out)) expect(Number.isFinite(v)).toBe(true);
  });
});
