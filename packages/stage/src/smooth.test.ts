import { formatOutput } from "@tintelix/schema";
import { smoothToward } from "./smooth";

// The player paints every other frame at 60 fps and eases by 1 - e^(-5 × seconds since the last paint).
const k = 1 - Math.exp(-(2 / 60) * 5);
const settle = (display: Record<string, number>, target: Record<string, number>) => {
  for (let i = 0; i < 400; i++) smoothToward(display, target, k);
};

describe("smoothToward", () => {
  it("eases toward the target", () => {
    const d = { hitRatePct: 0 };
    smoothToward(d, { hitRatePct: 100 }, 0.5);
    expect(d.hitRatePct).toBe(50);
  });

  it("lands exactly on the target, so a 100% slider never reads 99.9% on the stage", () => {
    const d = { hitRatePct: 82 };
    settle(d, { hitRatePct: 100 });
    expect(d.hitRatePct).toBe(100);
    expect(formatOutput("hitRatePct", d.hitRatePct)).toBe("100%");
    settle(d, { hitRatePct: 99 });
    expect(formatOutput("hitRatePct", d.hitRatePct)).toBe("99%");
  });

  it("settles on 100% within a second and a half of paints, not after a long tail of 99.9%", () => {
    const d = { hitRatePct: 82 };
    for (let i = 0; i < 45; i++) smoothToward(d, { hitRatePct: 100 }, k);
    expect(formatOutput("hitRatePct", d.hitRatePct)).toBe("100%");
  });
});
