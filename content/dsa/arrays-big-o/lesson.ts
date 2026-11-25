import type { DsaLesson, Frame } from "@tintelix/schema";

/** Each run's answer worked out with plain array code, so the presets don't trust the traced algorithms. */
function answers(nums: number[], k: number) {
  const windows = Array.from({ length: Math.max(0, nums.length - k + 1) }, (_, i) => nums.slice(i, i + k).reduce((a, b) => a + b, 0));
  const rows = Array.from({ length: Math.ceil(nums.length / k) }, (_, r) => nums.slice(r * k, r * k + k));
  return { read: nums.at(-1), insert: [0, ...nums], grid: rows, slow: windows, pattern: windows };
}
const preset = (id: string, label: string, nums: number[], k: number, edge?: "one" | "dupes" | "worst") => ({ id, label, input: { nums, k }, expect: null, expectByRun: answers(nums, k), ...(edge ? { edge } : {}) });
const NUMS = [4, 1, 3, 2, 5, 6, 2, 1];
const array = (f: Frame, id: string) => f.structs[id] as Extract<Frame["structs"][string], { kind: "array" }>;

/** Lesson 2: reading is O(1), inserting at the front is O(n), and prefix sums turn many range sums into subtractions. */
export const arraysBigO: DsaLesson = {
  id: "dsa-arrays-big-o",
  home: "dsa",
  slug: "arrays-big-o",
  topic: "Arrays and Big O",
  title: "Why inserting at the front is slow",
  promise: "What an array does in one step and what costs n, named in Big O, and prefix sums for range sums.",
  minutes: 12,
  level: 1,
  runs: {
    read: { algo: "readLast", label: "Read a cell", listing: "read", time: "O(1)", space: "O(1)", args: ["nums"] },
    insert: { algo: "insertFront", label: "Insert at the front", listing: "insert", time: "O(n)", space: "O(1)", args: ["nums"] },
    grid: { algo: "toGrid", label: "Rows of a grid", listing: "grid", time: "O(n)", space: "O(n)" },
    slow: { algo: "windowSums", label: "Add up every window", listing: "windows", time: "O(n·k)", space: "O(1) extra" },
    pattern: { algo: "windowSumsPrefix", label: "Prefix sums", listing: "prefix", time: "O(n)", space: "O(n)" },
  },
  presets: [
    preset("example", "4, 1, 3, 2, 5, 6, 2, 1 · k 3", NUMS, 3),
    preset("single", "One window of 8", NUMS, 8),
    preset("one", "One number", [7], 1, "one"),
    preset("dupes", "2, 2, 2, 2 · k 2", [2, 2, 2, 2], 2, "dupes"),
    preset("worst", "12 numbers · k 6", [3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5, 8], 6, "worst"),
  ],
  input: {
    nums: { kind: "ints", label: "Numbers", min: -99, max: 99, length: [1, 12] },
    k: { kind: "int", label: "Window k", min: 1, max: 8 },
  },
  counter: "Steps",
  steps: [
    {
      id: "cells",
      part: "problem",
      title: "Numbered cells, side by side",
      short: "Cells",
      text: [
        "An array keeps its items in numbered cells, one after another in memory. To read cell 7, the computer works out where it is and jumps straight there.",
        "That takes {readSteps} step whether the array has 8 cells or 8 million. A cost that doesn't grow with the input is written **O(1)**.",
      ],
      run: "read",
      preset: "example",
    },
    {
      id: "insert",
      part: "slow",
      title: "Inserting at the front moves everything",
      short: "Insert",
      text: [
        "Putting a 0 at the front needs cell 0 free, so every item moves one cell right first, starting from the end.",
        "For 8 numbers that's {insertSteps} steps. Double the array and the work doubles: a cost that grows in step with n is **O(n)**.",
      ],
      run: "insert",
      preset: "example",
      predict: {
        at: { site: "shift", nth: 2 },
        ask: "1 and 2 have moved right. Which number moves next?",
        options: ["6", "4", "1 again"],
        answer: 0,
        check: (f) => {
          const a = array(f, "nums");
          const v = a.values[a.marks.indexOf("active")];
          return v === 6 ? 0 : v === 4 ? 1 : 2;
        },
      },
    },
    {
      id: "big-o",
      part: "pattern",
      title: "Big O names how the cost grows",
      short: "Big O",
      text: [
        "With 12 numbers, inserting at the front takes {insertSteps} steps. Big O drops the details and keeps the shape: **O(1)** stays flat, **O(n)** grows with n, **O(n²)** grows with n × n, like lesson 1's every pair.",
        "Input size tells you which shape is fast enough: up to about 5,000 items, n² is fine; up to a million, you need n log n or n.",
      ],
      run: "insert",
      preset: "worst",
      note: { kind: "tip", text: "Interviewers ask for the time and the extra space. Say both, in Big O, for every answer you give." },
    },
    {
      id: "windows",
      part: "slow",
      title: "Every window, added up from scratch",
      short: "Range sums",
      text: [
        "A common question: the sum of every window of k numbers. The obvious way adds each window up from scratch.",
        "With 8 numbers and windows of 3, that's {slowSteps} additions: about n × k. Neighbouring windows overlap, so most of those additions repeat work already done.",
      ],
      run: "slow",
      preset: "example",
    },
    {
      id: "prefix",
      part: "pattern",
      title: "Prefix sums: build once, subtract after",
      short: "Prefix sums",
      text: [
        "Build **prefix**, where prefix[i] is the sum of the first i numbers, in one pass. Then the window from i to j − 1 is prefix[j] − prefix[i]: everything before i cancels.",
        "That's {patternSteps} steps here: n additions to build, then one subtraction per window.",
      ],
      run: "pattern",
      preset: "example",
      predict: {
        at: { site: "window", nth: 1 },
        ask: "The next window is cells 1 to 3. What is prefix[4] − prefix[1]?",
        options: ["6", "10", "5"],
        answer: 0,
        check: (f) => (f.vars.sum === 6 ? 0 : f.vars.sum === 10 ? 1 : 2),
      },
    },
    {
      id: "compare",
      part: "pattern",
      title: "The gap grows with the window",
      short: "Compare",
      text: ["12 numbers, windows of 6: adding each window takes {slowSteps} steps, prefix sums {patternSteps}. Prefix sums cost O(n) however wide the windows are."],
      run: "pattern",
      preset: "worst",
      compare: ["slow", "pattern"],
    },
    {
      id: "grid",
      part: "pattern",
      title: "A grid is an array of rows",
      short: "Grids",
      text: [
        "A grid is stored row after row. With rows k wide, index i sits at **row i ÷ k, column i mod k**: no searching, still one step to read.",
        "Grid problems such as Spiral Matrix and Set Matrix Zeroes walk these rows and columns.",
      ],
      run: "grid",
      preset: "example",
    },
    {
      id: "spot",
      part: "spot",
      title: "When to reach for prefix sums",
      short: "Spot it",
      text: ["Reach for prefix sums when you need many range sums from an array that doesn't change. The card sums it up."],
      run: "pattern",
      preset: "example",
      from: "end",
    },
    {
      id: "breaks",
      part: "breaks",
      title: "One question, or a changing array",
      short: "Breaks",
      text: [
        "With a single window of 8, adding it up takes {slowSteps} steps and building prefix sums {patternSteps}: one question doesn't repay the build.",
        "And if the array changes between questions, the prefix sums go stale and must be rebuilt, O(n) each time.",
      ],
      run: "pattern",
      preset: "single",
      compare: ["slow", "pattern"],
    },
    {
      id: "practice",
      part: "practice",
      title: "Your turn",
      short: "Practice",
      text: ["Product of Array Except Self uses prefix and suffix products. Best Time to Buy and Sell Stock keeps a running minimum. Spiral Matrix and Set Matrix Zeroes walk a grid."],
      run: "grid",
      preset: "worst",
    },
    {
      id: "recap",
      part: "recap",
      title: "What to remember",
      short: "Recap",
      text: ["Reading a cell is O(1); inserting at the front is O(n). Big O keeps the shape of the cost. Prefix sums answer many range sums with one subtraction each, after an O(n) build."],
      run: "pattern",
      preset: "example",
      from: "end",
    },
  ],
  card: {
    signal: "Many range sums over an array that doesn't change",
    reachFor: "Prefix sums: prefix[i] holds the sum of the first i numbers",
    askYourself: "Can I build something once so each question becomes a subtraction?",
    whyItWorks: "prefix[j] − prefix[i] cancels everything before i, leaving cells i to j − 1",
    trap: "Start prefix with a 0, or a range that starts at cell 0 breaks",
  },
  practice: [
    { slug: "product-of-array-except-self", core: true },
    { slug: "best-time-to-buy-and-sell-stock", core: true },
    { slug: "spiral-matrix", core: true },
    { slug: "set-matrix-zeroes", core: true },
  ],
  ask: ["Will the array change between questions?", "How many questions will there be?", "How big can n get?"],
  buildsOn: ["dsa-how-to-solve"],
  questions: [],
  cheatsheet: [
    { heading: "Array costs", text: ["Read or write a cell by index: O(1). Insert or delete at the front or middle: O(n), everything after it moves. Append at the end: O(1) on average."] },
    { heading: "Input size tells you the speed", text: ["Up to 12: n! is fine. Up to 20–25: 2ⁿ. Up to 500: n³. Up to 5,000: n². Up to a million: n log n or n. Larger: log n or 1."] },
    { heading: "Grids", text: ["Stored row after row: index i is row i ÷ k, column i mod k for rows k wide."] },
  ],
};
