import { fitLabelX } from "./canvas";

describe("fitLabelX", () => {
  it("pulls a label that would run off the right edge back inside the stage (ALL KEYS EXPIRED on a phone)", () => {
    const x = fitLabelX(271, 145, 366);
    expect(x + 145).toBeLessThanOrEqual(366 - 6);
  });

  it("keeps a label off the left edge", () => {
    expect(fitLabelX(-10, 50, 366)).toBe(6);
  });

  it("leaves a label that already fits where it is", () => {
    expect(fitLabelX(100, 50, 366)).toBe(100);
  });
});
