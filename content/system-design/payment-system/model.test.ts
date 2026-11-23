import { formatOutput } from "@tintelix/schema/format";
import { paymentModel } from "./model";

const run = (extra: Record<string, number> = {}) => paymentModel.run({ ...paymentModel.defaults, ...extra }) as Record<string, number>;
const show = (extra: Record<string, number>, name: string) => formatOutput(name, run(extra)[name]!);

describe("payment system model (book chapter 136's numbers)", () => {
  it("20 million attempts a day: 231 a second, 694 at peak", () => {
    expect(show({}, "avgRate")).toBe("231");
    expect(show({}, "peakRate")).toBe("694");
    expect(show({}, "captureRate")).toBe("213");
    expect(show({}, "capturePeak")).toBe("640");
    expect(show({}, "refundRate")).toBe("4.3");
  });

  it("charging before recording turns one timeout in 10,000 into 2,000 double charges a day", () => {
    expect(show({ mode: 2 }, "dupsPerDay")).toBe("2,000");
    expect(show({ mode: 2, timeoutsPer10k: 5 }, "dupsPerDay")).toBe("10,000");
    expect(show({ mode: 3 }, "dupsNow")).toBe("0");
    expect(show({ mode: 2 }, "dupsNow")).toBe("2,000");
  });

  it("every money movement is two ledger rows", () => {
    expect(show({}, "ledgerRowsM")).toBe("38");
  });

  it("guards against nonsense inputs", () => {
    const out = run({ attemptsPerDay: -1, authPct: Number.NaN, timeoutsPer10k: -3 });
    for (const v of Object.values(out)) expect(Number.isFinite(v)).toBe(true);
  });
});
