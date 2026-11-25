import type { DsaLesson, Frame } from "@tintelix/schema";

/** Each run's answer worked out with plain code, so the presets don't trust the traced algorithms. */
function answers(nums: number[], target: number) {
  // Plain halving as the listing writes it; on numbers that aren't sorted it can miss, and that's what it returns.
  let pattern = -1;
  for (let lo = 0, hi = nums.length - 1; lo <= hi; ) {
    const mid = Math.floor((lo + hi) / 2);
    if (nums[mid] === target) {
      pattern = mid;
      break;
    }
    if (nums[mid]! < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return { slow: nums.indexOf(target), rotated: nums.indexOf(target), sqrt: Math.floor(Math.sqrt(target)), pattern };
}
const preset = (id: string, label: string, nums: number[], target: number, edge?: "empty" | "one" | "worst") => ({
  id,
  label,
  input: { nums, target },
  expect: null,
  expectByRun: answers(nums, target),
  ...(edge ? { edge } : {}),
});
const at = (f: Frame, name: string) => f.pointers.find((p) => p.name === name)?.at;

/** Lesson 7: the range halves each step; rotated arrays; searching on the answer. */
export const binarySearch: DsaLesson = {
  id: "dsa-binary-search",
  home: "dsa",
  slug: "binary-search",
  topic: "Binary search",
  title: "Twenty guesses for a million",
  promise: "The range halves each step; rotated arrays; searching on the answer.",
  minutes: 12,
  level: 2,
  runs: {
    slow: { algo: "linear", label: "One at a time", listing: "linear", time: "O(n)", space: "O(1)" },
    rotated: { algo: "rotated", label: "Rotated array", listing: "rotated", time: "O(log n)", space: "O(1)" },
    sqrt: { algo: "sqrt", label: "Search the answers", listing: "sqrt", time: "O(log x)", space: "O(1)", args: ["target"] },
    pattern: { algo: "binary", label: "Binary search", listing: "binary", time: "O(log n)", space: "O(1)" },
  },
  presets: [
    preset("example", "2 … 91, find 23", [2, 5, 8, 12, 16, 23, 38, 56, 72, 91], 23),
    preset("rotated", "15, 18, 22, 3, 5, 8, 11 → 18", [15, 18, 22, 3, 5, 8, 11], 18),
    preset("million", "√1,000,000", [], 1000000),
    preset("worst", "16 numbers, find 100", [3, 7, 11, 14, 19, 23, 27, 31, 36, 40, 44, 49, 53, 58, 62, 67], 100, "worst"),
    preset("one", "One number", [7], 7, "one"),
    preset("empty", "Empty list, √4", [], 4, "empty"),
  ],
  input: {
    nums: { kind: "ints", label: "Numbers", min: 0, max: 999, length: [0, 16] },
    target: { kind: "int", label: "Target, or x for √x", min: 0, max: 1000000 },
  },
  counter: "Steps",
  steps: [
    {
      id: "problem",
      part: "problem",
      title: "Find a number in sorted numbers",
      short: "Find it",
      text: ["Where is 23 in these 10 sorted numbers? Think of guessing a number from 1 to 100: nobody guesses 1, 2, 3."],
      run: "slow",
      preset: "example",
      to: "start",
    },
    {
      id: "linear",
      part: "slow",
      title: "One at a time",
      short: "One at a time",
      text: ["Looking from the left finds 23 after {slowSteps} looks. With a million numbers that's up to a million looks, and the sorting never helped."],
      run: "slow",
      preset: "example",
    },
    {
      id: "halve",
      part: "pattern",
      title: "Probe the middle, throw away half",
      short: "Halve it",
      text: [
        "Keep a range from **lo** to **hi**. Look at the middle. Too small? The target can only be to its right, so the whole left half goes. Too big? The right half goes.",
        "That finds 23 in {patternSteps} probes. Each probe halves what's left: O(log n).",
      ],
      run: "pattern",
      preset: "example",
      predict: {
        at: { site: "probe", nth: 1 },
        ask: "The middle is 16, smaller than 23. Where can 23 be?",
        options: ["Right of 16: lo moves to position 5", "Left of 16: hi moves to position 3", "Anywhere: nothing is ruled out"],
        answer: 0,
        check: (f) => (at(f, "lo") === 5 ? 0 : at(f, "hi") === 3 ? 1 : 2),
      },
    },
    {
      id: "compare",
      part: "pattern",
      title: "Halving beats counting",
      short: "Compare",
      text: [
        "16 numbers without the target: one at a time takes {slowSteps} looks, binary search {patternSteps} probes, since 16 → 8 → 4 → 2 → 1.",
        "A million numbers need about 20 probes; a billion, about 30.",
      ],
      run: "pattern",
      preset: "worst",
      compare: ["slow", "pattern"],
    },
    {
      id: "breaks",
      part: "breaks",
      title: "Turned at one point",
      short: "Breaks",
      text: [
        "15, 18, 22, 3, 5, 8, 11 is sorted, then turned so it starts in the middle. Plain binary search sees 3 in the middle, decides 18 must be to the right, and throws 18 away.",
        "Halving only works when one comparison really does rule out a half.",
      ],
      run: "pattern",
      preset: "rotated",
    },
    {
      id: "rotated",
      part: "pattern",
      title: "One half is always sorted",
      short: "Rotated",
      text: [
        "Cut a turned list in the middle and at least one half is still in order. Check whether the target fits between that half's ends: if it does, keep that half; if not, keep the other.",
        "18 is found in {rotatedSteps} probes: still O(log n).",
      ],
      run: "rotated",
      preset: "rotated",
      predict: {
        at: { site: "probe", nth: 1 },
        ask: "The middle is 3. 15 is bigger than 3, so the right half, 3 to 11, is the sorted one. Can 18 be in it?",
        options: ["No: keep the left half", "Yes: keep the right half"],
        answer: 0,
        check: (f) => (f.site === "not-right" ? 0 : 1),
      },
    },
    {
      id: "answer",
      part: "pattern",
      title: "Search the answers, not a list",
      short: "On the answer",
      text: [
        "What's the whole square root of 1,000,000? There's no list, but the possible answers 0 to 1,000,000 are in order: if a guess squared fits, every smaller guess fits too.",
        "So halve the answers instead. That takes {sqrtSteps} guesses for a million: the lesson's title.",
      ],
      run: "sqrt",
      preset: "million",
    },
    {
      id: "spot",
      part: "spot",
      title: "When to reach for binary search",
      short: "Spot it",
      text: ["Reach for binary search on sorted data, or on any yes/no question that flips once as the answer grows. The card sums it up."],
      run: "pattern",
      preset: "example",
      from: "end",
    },
    {
      id: "practice",
      part: "practice",
      title: "Your turn",
      short: "Practice",
      text: [
        "Search Insert Position is the plain loop, returning lo when the target is missing. Search in Rotated Sorted Array is this lesson's turned list. Sqrt(x) and Koko Eating Bananas search on the answer.",
      ],
      run: "rotated",
      preset: "rotated",
      from: "end",
    },
    {
      id: "recap",
      part: "recap",
      title: "What to remember",
      short: "Recap",
      text: ["Binary search probes the middle and throws away the half that can't hold the answer: O(log n), about 20 probes for a million. A turned list still has one sorted half. And any yes/no question that flips once can be searched the same way."],
      run: "pattern",
      preset: "worst",
      from: "end",
    },
  ],
  card: {
    signal: "Sorted data and a big n, or a yes/no question that flips once as the answer grows",
    reachFor: "Binary search: probe the middle of lo..hi and throw away the half that can't hold the answer",
    askYourself: "If this guess is wrong, which half can I rule out for certain?",
    whyItWorks: "Order lets one comparison rule out half the range, so n shrinks to 1 in about log₂ n probes",
    trap: "Off by one: decide whether hi is inside the range, then move lo to mid + 1 and hi to mid − 1",
  },
  practice: [
    { slug: "search-insert-position", core: true },
    { slug: "search-in-rotated-sorted-array", core: true },
    { slug: "sqrtx", core: true },
    { slug: "koko-eating-bananas", core: true },
    { slug: "find-minimum-in-rotated-sorted-array", core: false },
  ],
  ask: ["Is the data sorted, and which way?", "Can values repeat, and which copy do you want?", "If the target is missing, what should come back?"],
  buildsOn: ["dsa-arrays-big-o"],
  questions: [],
  cheatsheet: [
    { heading: "The loop", text: ["lo = 0, hi = n − 1. While lo ≤ hi: mid = (lo + hi) ÷ 2. Found: return mid. Too small: lo = mid + 1. Too big: hi = mid − 1. O(log n) time, O(1) space."] },
    { heading: "How many probes", text: ["About log₂ n: 1,000 → 10, 1,000,000 → 20, 1,000,000,000 → 30."] },
    { heading: "Rotated", text: ["One half around mid is always sorted. If the target fits between that half's ends, keep it; otherwise keep the other half."] },
    { heading: "Search on the answer", text: ["When \"does x work?\" is yes up to some point and no after it (or the reverse), binary search the answers: square roots, speeds, capacities, days."] },
  ],
};
