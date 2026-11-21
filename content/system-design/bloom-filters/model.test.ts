import { formatOutput } from "@tintelix/schema/format";
import { bloomModel } from "./model";

const run = (extra: Record<string, number>) => bloomModel.run({ ...bloomModel.defaults, ...extra }) as Record<string, number>;
const show = (extra: Record<string, number>, name: string) => formatOutput(name, run(extra)[name]!);

describe("Bloom filter model", () => {
  it("without a filter, every lookup reads the disk, even for keys that aren't there", () => {
    expect(show({}, "diskReads")).toBe("10,000");
    expect(show({}, "absentRps")).toBe("8,000");
  });

  it("10 bits a key and 7 hashes: under 1% false positives (§59.3)", () => {
    const on = { filter: 1 };
    expect(run(on).hashes).toBe(7);
    expect(show(on, "fpPct")).toBe("0.82%");
    expect(show(on, "diskReads")).toBe("2,066");
    expect(show(on, "savedPct")).toBe("79%");
    expect(show(on, "filterMb")).toBe("125");
    expect(show(on, "keysMb")).toBe("2,000");
    expect(show({ filter: 1, bitsPerKey: 20 }, "fpPct")).toBe("0.01%");
  });

  it("a filter left the same size while keys double says maybe far more often", () => {
    const grown = { filter: 1, keys: 200_000_000 };
    expect(show(grown, "actualBits")).toBe("5");
    expect(show(grown, "fpPct")).toBe("14%");
    expect(show(grown, "diskReads")).toBe("3,102");
  });
});
