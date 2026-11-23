import { formatOutput } from "@tintelix/schema/format";
import { syncModel } from "./model";

const run = (extra: Record<string, number> = {}) => syncModel.run({ ...syncModel.defaults, ...extra }) as Record<string, number>;
const show = (extra: Record<string, number>, name: string) => formatOutput(name, run(extra)[name]!);

describe("file sync model (book chapter 132's numbers)", () => {
  it("120 million devices, 41,667 changes a second at peak, 200 PB", () => {
    expect(show({}, "devicesM")).toBe("120");
    expect(show({}, "avgRate")).toBe("13,889");
    expect(show({}, "peakRate")).toBe("41,667");
    expect(show({}, "storagePb")).toBe("200");
    expect(show({}, "wholeGBs")).toBe("833");
  });

  it("whole-file uploads work at launch and swamp the upload tier at peak", () => {
    expect(show({ mode: 1 }, "uploadBusyPct")).toBe("1.4%");
    expect(show({ mode: 2 }, "uploadBusyPct")).toBe("278%");
    expect(show({ mode: 2 }, "uploadFailPct")).toBe("64%");
  });

  it("fixed chunks resend everything after an insert; content-defined chunks resend two, minus duplicates", () => {
    expect(show({ mode: 3 }, "fixedMovedMb")).toBe("10");
    expect(show({ mode: 3 }, "uploadBusyPct")).toBe("139%");
    expect(show({ mode: 4 }, "blockMovedMb")).toBe("8");
    expect(show({ mode: 4 }, "sentMb")).toBe("5.6");
    expect(show({ mode: 4 }, "uploadBusyPct")).toBe("78%");
  });

  it("the bigger the file, the bigger the saving: a 2 GB file is 512 chunks and an edit moves 0.39% of it", () => {
    expect(show({ fileMb: 2048 }, "fileChunks")).toBe("512");
    expect(show({ fileMb: 2048 }, "movedSharePct")).toBe("0.39%");
    expect(show({ fileMb: 2 }, "blockMovedMb")).toBe("2");
    expect(show({}, "movedSharePct")).toBe("40%");
  });

  it("conflicts appear only when two devices edited offline", () => {
    expect(show({ mode: 5 }, "conflictPct")).toBe("10%");
    expect(show({ mode: 4 }, "conflictPct")).toBe("0%");
  });

  it("guards against nonsense inputs", () => {
    const out = run({ accounts: -1, fileMb: 0, chunkMb: 0, uploadCapGBs: 0, dedupPct: Number.NaN });
    for (const v of Object.values(out)) expect(Number.isFinite(v)).toBe(true);
  });
});
