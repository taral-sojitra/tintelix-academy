import { makeWire, posAt } from "./geometry";

describe("makeWire", () => {
  it("a straight wire is as long as the distance between its ends", () => {
    expect(makeWire([0, 0], [100, 0]).len).toBeCloseTo(100, 6);
  });

  it("samples 49 points by default and its cumulative length ends at len", () => {
    const w = makeWire([386, 281], [446, 146]);
    expect(w.pts).toHaveLength(49);
    expect(w.cum.at(-1)).toBe(w.len);
  });
});

describe("posAt", () => {
  const w = makeWire([386, 281], [446, 146]);

  it("starts at the first end and finishes at the second", () => {
    expect(posAt(w, 0)).toEqual([386, 281]);
    const [x, y] = posAt(w, w.len);
    expect(x).toBeCloseTo(446, 6);
    expect(y).toBeCloseTo(146, 6);
  });

  it("clamps positions before the start and past the end", () => {
    expect(posAt(w, -50)).toEqual(posAt(w, 0));
    expect(posAt(w, w.len + 50)).toEqual(posAt(w, w.len));
  });

  it("offsets sideways from the wire", () => {
    const flat = makeWire([0, 0], [100, 0]);
    const [, y] = posAt(flat, 50, 4);
    expect(Math.abs(y)).toBeCloseTo(4, 6);
  });
});
