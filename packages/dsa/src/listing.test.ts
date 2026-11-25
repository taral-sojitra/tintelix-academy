import { describe, expect, it } from "vitest";
import { parseListing, siteLiterals } from "./listing";

const TS = `export function pairs(nums: number[]) {
  for (let i = 0; i < nums.length; i++) {
    if (nums[i] > 0) return i;   // @check @found
    total += 1; // @changed
  }
  return -1;  // @none
}`;

const PY = `def pairs(nums):
    for i in range(len(nums)):
        if nums[i] > 0:  # @check
            return i     # @check
    return -1  # @none @changed`;

describe("parseListing", () => {
  it("maps sites to lines and strips the markers", () => {
    const l = parseListing(TS, "ts");
    expect(l.sites).toEqual({ check: [3], found: [3], none: [6] });
    expect(l.changed).toEqual([4]);
    expect(l.lines[2]).toBe("    if (nums[i] > 0) return i;");
    expect(l.lines[3]).toBe("    total += 1;");
    expect(l.code).not.toContain("@");
  });

  it("lets one site mark several lines and reads Python comments", () => {
    const l = parseListing(PY, "py");
    expect(l.sites).toEqual({ check: [3, 4], none: [5] });
    expect(l.changed).toEqual([5]);
    expect(l.lines[4]).toBe("    return -1");
  });

  it("leaves ordinary comments alone", () => {
    const l = parseListing("x = 1  # the start\ny = 2 // keep", "py");
    expect(l.lines).toEqual(["x = 1  # the start", "y = 2 // keep"]);
    expect(l.sites).toEqual({});
  });
});

describe("siteLiterals", () => {
  it("finds every t.at site in an algorithm's source", () => {
    const src = `t.at("check", \`\${a} + \${b}\`);\n  t.at('found', "yes");\n t.at( "none" , "no")`;
    expect(siteLiterals(src)).toEqual(["check", "found", "none"]);
  });
});
