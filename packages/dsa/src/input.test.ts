import { describe, expect, it } from "vitest";
import type { InputSpec } from "@tintelix/schema";
import { argsFor, checkValue, formatInput, parseInput } from "./input";

const spec: InputSpec = {
  nums: { kind: "ints", label: "Numbers", min: -99, max: 99, length: [0, 16] },
  target: { kind: "int", label: "Target", min: -198, max: 198 },
};

describe("parseInput", () => {
  it("reads numbers split by commas or spaces", () => {
    expect(parseInput(spec, { nums: "3, 8, 1", target: "10" })).toEqual({ ok: true, value: { nums: [3, 8, 1], target: 10 } });
    expect(parseInput(spec, { nums: "3 8  1", target: " 10 " })).toEqual({ ok: true, value: { nums: [3, 8, 1], target: 10 } });
  });
  it("reads an empty list when the length allows it", () => {
    expect(parseInput(spec, { nums: "  ", target: "5" })).toEqual({ ok: true, value: { nums: [], target: 5 } });
  });
  it("names the value that isn't a whole number", () => {
    expect(parseInput(spec, { nums: "3, x", target: "1" })).toEqual({ ok: false, errors: { nums: "“x” isn't a whole number." } });
    expect(parseInput(spec, { nums: "1", target: "abc" })).toEqual({ ok: false, errors: { target: "“abc” isn't a whole number." } });
    expect(parseInput(spec, { nums: "1.5", target: "1" })).toEqual({ ok: false, errors: { nums: "“1.5” isn't a whole number." } });
  });
  it("keeps lists short enough to fit", () => {
    const r = parseInput(spec, { nums: Array.from({ length: 17 }, () => "1").join(","), target: "1" });
    expect(r).toEqual({ ok: false, errors: { nums: "Keep it to 16 numbers so every cell fits." } });
  });
  it("keeps values in range", () => {
    expect(parseInput(spec, { nums: "120", target: "1" })).toEqual({ ok: false, errors: { nums: "Keep each number between −99 and 99: 120 is outside." } });
    expect(parseInput(spec, { nums: "1", target: "500" })).toEqual({ ok: false, errors: { target: "Keep it between −198 and 198." } });
  });
  it("asks for sorted and distinct numbers when the lesson needs them", () => {
    const s: InputSpec = { nums: { kind: "ints", label: "Numbers", min: 0, max: 9, length: [2, 8], sorted: true, distinct: true } };
    expect(parseInput(s, { nums: "7, 3" })).toEqual({ ok: false, errors: { nums: "The numbers need to be sorted: 7 comes before 3." } });
    expect(parseInput(s, { nums: "2, 4, 4" })).toEqual({ ok: false, errors: { nums: "Each number can appear once: 4 is there twice." } });
    expect(parseInput(s, { nums: "2" })).toEqual({ ok: false, errors: { nums: "Give at least 2 numbers." } });
  });
});

describe("formatInput, argsFor and checkValue", () => {
  it("round-trips a value through the form", () => {
    const value = { nums: [3, 8, 1], target: 10 };
    expect(parseInput(spec, formatInput(spec, value))).toEqual({ ok: true, value });
  });
  it("lists arguments in the order the spec names its fields", () => {
    expect(argsFor(spec, { target: 10, nums: [1] })).toEqual([[1], 10]);
  });
  it("checks a preset's value against the spec", () => {
    expect(checkValue(spec, { nums: [1, 2], target: 3 })).toEqual([]);
    expect(checkValue(spec, { nums: [1, 200], target: 3 })).toEqual(["nums: Keep each number between −99 and 99: 200 is outside."]);
    expect(checkValue(spec, { nums: [1] })).toEqual(["target: missing"]);
  });
});

describe("text fields", () => {
  const words: InputSpec = { s: { kind: "text", label: "Word", alphabet: "a-z", length: [0, 24] } };
  it("reads lowercase letters, trimmed", () => {
    expect(parseInput(words, { s: "  racecar " })).toEqual({ ok: true, value: { s: "racecar" } });
    expect(parseInput(words, { s: "" })).toEqual({ ok: true, value: { s: "" } });
  });
  it("names a character outside the alphabet", () => {
    expect(parseInput(words, { s: "Race" })).toEqual({ ok: false, errors: { s: "Use the letters a to z only: “R” isn't one." } });
    expect(parseInput(words, { s: "a b" })).toEqual({ ok: false, errors: { s: "Use the letters a to z only: “ ” isn't one." } });
  });
  it("keeps text short enough to fit", () => {
    expect(parseInput(words, { s: "a".repeat(25) })).toEqual({ ok: false, errors: { s: "Keep it to 24 letters so every cell fits." } });
    expect(checkValue(words, { s: "abc" })).toEqual([]);
    expect(formatInput(words, { s: "abc" })).toEqual({ s: "abc" });
  });
});
