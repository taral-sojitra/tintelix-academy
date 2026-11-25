import type { DsaLesson, Frame } from "@tintelix/schema";

/** Each run's answer worked out with plain array code, so the presets don't trust the traced algorithms. */
function answers(nums: number[], target: number) {
  let slow: number[] | null = null;
  for (let i = 0; i < nums.length && !slow; i++) for (let j = i + 1; j < nums.length && !slow; j++) if (nums[i]! + nums[j]! === target) slow = [i, j];
  // One pass finds the earliest second number, paired with the latest earlier partner (the map keeps the last position).
  let pattern: number[] | null = null;
  for (let j = 0; j < nums.length && !pattern; j++) for (let i = j - 1; i >= 0 && !pattern; i--) if (nums[i]! + nums[j]! === target) pattern = [i, j];
  let running = 0;
  for (let i = 0; i < nums.length; i++) for (let j = i, s = 0; j < nums.length; j++) if ((s += nums[j]!) === target) running++;
  return { buckets: nums.includes(target), slow, running, pattern };
}
const preset = (id: string, label: string, nums: number[], target: number, edge?: "one" | "dupes" | "worst") => ({
  id,
  label,
  input: { nums, target },
  expect: null,
  expectByRun: answers(nums, target),
  ...(edge ? { edge } : {}),
});
type MapSnap = Extract<Frame["structs"][string], { kind: "map" }>;
const marked = (f: Frame, id: string, mark: string) => {
  const m = f.structs[id] as MapSnap;
  return m.entries.filter((_, i) => m.marks[i] === mark).map(([k]) => k);
};

/** Lesson 4: keys land in buckets; Two Sum in one pass; a running sum counts subarrays. */
export const hashing: DsaLesson = {
  id: "dsa-hashing",
  home: "dsa",
  slug: "hashing",
  topic: "Hashing",
  title: "Find the pair in one pass",
  promise: "Keys land in buckets; Two Sum in one pass; a running sum counts subarrays.",
  minutes: 12,
  level: 1,
  runs: {
    buckets: { algo: "buckets", label: "Keys in buckets", listing: "buckets", time: "O(1) per lookup, on average", space: "O(n)" },
    slow: { algo: "everyPair", label: "Every pair", listing: "every-pair", time: "O(n²)", space: "O(1)" },
    running: { algo: "runningSum", label: "Running sum", listing: "running", time: "O(n)", space: "O(n)" },
    pattern: { algo: "seenMap", label: "One pass with a map", listing: "one-pass", time: "O(n)", space: "O(n)" },
  },
  presets: [
    preset("example", "3, 8, 1, 9, 4, 6 → 10", [3, 8, 1, 9, 4, 6], 10),
    preset("sums", "1, 2, 1, 2, 1 → 3", [1, 2, 1, 2, 1], 3),
    preset("collide", "7, 14, 21, 28, 35, 42 → 49", [7, 14, 21, 28, 35, 42], 49),
    preset("dupes", "3, 3 → 6", [3, 3], 6, "dupes"),
    preset("one", "One number", [5], 10, "one"),
    preset("worst", "1 to 16 → 31", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16], 31, "worst"),
  ],
  input: {
    nums: { kind: "ints", label: "Numbers", min: -99, max: 99, length: [0, 16] },
    target: { kind: "int", label: "Target", min: -198, max: 198 },
  },
  counter: "Steps",
  steps: [
    {
      id: "problem",
      part: "problem",
      title: "Two Sum, again",
      short: "Two Sum",
      text: [
        "Lesson 1 found two numbers that add up to a target by trying every pair. That's about n² ÷ 2 checks.",
        "This lesson finds the pair in **one pass**, by remembering what it has already seen.",
      ],
      run: "slow",
      preset: "example",
      to: "start",
    },
    {
      id: "every-pair",
      part: "slow",
      title: "Every pair, as before",
      short: "Every pair",
      text: ["Every pair finds positions 2 and 3 after {slowSteps} checks. Each new number is compared with all the others, and nothing learned along the way is kept."],
      run: "slow",
      preset: "example",
    },
    {
      id: "buckets",
      part: "pattern",
      title: "Keys land in buckets",
      short: "Buckets",
      text: [
        "A hash set keeps keys in **buckets**. Here a key's bucket is key mod 7: 3 goes in bucket 3, 8 in bucket 1. To look a key up, go straight to its bucket and check only what's there.",
        "Putting 6 numbers in and looking up 10 takes {bucketsSteps} steps: 10 belongs in bucket 3, which holds only 3. On average a lookup is O(1).",
      ],
      run: "buckets",
      preset: "example",
      predict: {
        at: { site: "put", nth: 2 },
        ask: "Next comes 1. Which bucket does it land in?",
        options: ["Bucket 1, with 8", "Bucket 2", "Bucket 0"],
        answer: 0,
        check: (f) => {
          const k = marked(f, "buckets", "active")[0];
          return k === "1" ? 0 : k === "2" ? 1 : 2;
        },
      },
    },
    {
      id: "one-pass",
      part: "pattern",
      title: "Remember what you've seen",
      short: "One pass",
      text: [
        "Walk the numbers once. Each number x needs the partner **target − x**. Ask the map whether that partner has been seen; if not, remember x and its position.",
        "That's {patternSteps} steps here, one look per number: O(n) time, paid for with O(n) space for the map.",
      ],
      run: "pattern",
      preset: "example",
      predict: {
        at: { site: "store", nth: 3 },
        ask: "1 is remembered at position 2. Next comes 9: is its partner, 10 − 9, in the map?",
        options: ["Yes: 1, at position 2", "No: remember 9 and go on"],
        answer: 0,
        check: (f) => (marked(f, "seen", "found").length ? 0 : 1),
      },
    },
    {
      id: "compare",
      part: "pattern",
      title: "Squares against a straight line",
      short: "Compare",
      text: ["16 numbers with the pair at the very end: every pair takes {slowSteps} checks, one pass {patternSteps}. Double the numbers and the first roughly quadruples; the second only doubles."],
      run: "pattern",
      preset: "worst",
      compare: ["slow", "pattern"],
    },
    {
      id: "running",
      part: "pattern",
      title: "A running sum counts subarrays",
      short: "Running sum",
      text: [
        "How many runs of neighbouring numbers add up to k? Keep a running sum, like lesson 2's prefix sums. A run ends here exactly when **sum − k** was a running sum earlier.",
        "So count running sums in a map, starting with 0 seen once. That's {runningSteps} steps to find all 4 runs: O(n), instead of trying every start and end.",
      ],
      run: "running",
      preset: "sums",
    },
    {
      id: "breaks",
      part: "breaks",
      title: "When every key lands in one bucket",
      short: "Breaks",
      text: [
        "7, 14, 21 and the rest all leave remainder 0, so they all land in bucket 0. Looking up 49 now checks every key: {bucketsSteps} steps, 6 to put and 6 to check.",
        "Real hash functions spread keys well, so this is rare. But O(1) is the average, not a promise: the worst case is O(n).",
      ],
      run: "buckets",
      preset: "collide",
      note: { kind: "next", text: "A map also costs O(n) space. When the numbers are sorted, the next lesson's two pointers find the pair with none." },
    },
    {
      id: "spot",
      part: "spot",
      title: "When to reach for a map",
      short: "Spot it",
      text: ["Reach for a hash map or set when the slow way keeps searching for something it has already walked past. The card sums it up."],
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
        "Two Sum is this lesson's one pass. Group Anagrams keys a map by each word's sorted letters. Longest Consecutive Sequence asks a set about each number's neighbours. Subarray Sum Equals K is the running sum.",
      ],
      run: "running",
      preset: "sums",
      from: "end",
    },
    {
      id: "recap",
      part: "recap",
      title: "What to remember",
      short: "Recap",
      text: ["A hash map puts each key in a bucket, so a lookup is O(1) on average. Look for what you need before storing what you have, and one pass replaces every pair. A running sum in a map counts subarrays that add up to k."],
      run: "pattern",
      preset: "worst",
      from: "end",
    },
  ],
  card: {
    signal: "The slow way keeps searching for something it has already walked past: a value, a partner, a running sum",
    reachFor: "A hash map or set: remember each item as you pass it, and ask about the one you need",
    askYourself: "What would I need to have seen already to answer this in one step?",
    whyItWorks: "A key's hash picks its bucket, so a lookup checks one bucket, not the whole list: O(1) on average",
    trap: "Look before you store, or a number can pair with itself; and the map costs O(n) space",
  },
  practice: [
    { slug: "two-sum", core: true },
    { slug: "group-anagrams", core: true },
    { slug: "longest-consecutive-sequence", core: true },
    { slug: "subarray-sum-equals-k", core: true },
  ],
  ask: ["Is there always exactly one answer?", "Can I use the same element twice?", "Can the numbers be negative?"],
  buildsOn: ["dsa-arrays-big-o"],
  questions: [],
  cheatsheet: [
    { heading: "Hash map costs", text: ["Insert, look up and delete: O(1) on average, O(n) in the worst case when keys collide. Space: O(n). Keys have no order; sort them yourself if order matters."] },
    { heading: "Two Sum in one pass", text: ["For each x: look up target − x first, then store x with its position."] },
    { heading: "Running sum with a map", text: ["Start the map with {0: 1}. For each number: sum += x; count += seen[sum − k]; seen[sum] += 1. Works with negative numbers, where a sliding window doesn't."] },
  ],
};
