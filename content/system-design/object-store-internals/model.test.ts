import { formatOutput } from "@tintelix/schema/format";
import { objectStoreModel } from "./model";

const run = (extra: Record<string, number> = {}) => objectStoreModel.run({ ...objectStoreModel.defaults, ...extra }) as Record<string, number>;
const show = (extra: Record<string, number>, name: string) => formatOutput(name, run(extra)[name]!);

describe("object store internals model", () => {
  it("a trillion objects of 250 KB is 250 PB of data", () => {
    expect(show({}, "objectsT")).toBe("1");
    expect(show({}, "rawPb")).toBe("250");
  });

  it("one copy: 12,500 disks, one dying every day and a half, each taking 80 million objects", () => {
    expect(show({ mode: 2 }, "disks")).toBe("12,500");
    expect(show({ mode: 2 }, "failuresPerDay")).toBe("0.7");
    expect(show({ mode: 2 }, "objectsPerDiskM")).toBe("80");
    expect(show({ mode: 2 }, "lostPct")).toBe("2%");
    expect(show({ mode: 1 }, "lostPct")).toBe("0%");
  });

  it("three copies survive two failures but store 750 PB", () => {
    expect(show({ mode: 3 }, "storedPb")).toBe("750");
    expect(show({ mode: 3 }, "tolerance")).toBe("2");
    expect(show({ mode: 3 }, "failuresPerDay")).toBe("2.1");
    expect(show({ mode: 3 }, "lostPct")).toBe("0%");
  });

  it("10 + 4 erasure coding survives four failures in 350 PB", () => {
    expect(show({ mode: 4 }, "storedPb")).toBe("350");
    expect(show({ mode: 4 }, "tolerance")).toBe("4");
    expect(show({ mode: 4 }, "overheadX")).toBe("1.4");
    expect(show({ mode: 4 }, "savedPb")).toBe("400");
    expect(show({ mode: 4, parity: 2 }, "storedPb")).toBe("300");
    expect(show({ mode: 4, parity: 2 }, "tolerance")).toBe("2");
  });

  it("metadata and packing: 300 TB of metadata on 150 shards, 250 million packed files", () => {
    expect(show({ mode: 5 }, "metaTb")).toBe("300");
    expect(show({ mode: 5 }, "metaShards")).toBe("150");
    expect(show({ mode: 5 }, "packedFilesM")).toBe("250");
  });

  it("guards against nonsense inputs", () => {
    const out = run({ objects: -1, diskTb: 0, parity: 99, dataPieces: 0, shardTb: 0, packGb: Number.NaN });
    for (const v of Object.values(out)) expect(Number.isFinite(v)).toBe(true);
  });
});
