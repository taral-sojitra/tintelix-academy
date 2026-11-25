import type { DsaLesson, Frame } from "@tintelix/schema";

/** Each run's answer worked out with plain array code, so the presets don't trust the traced algorithms. */
function answers(nums: number[], target: number) {
  let slow: number[] | null = null;
  for (let i = 0; i < nums.length && !slow; i++) for (let j = i + 1; j < nums.length && !slow; j++) if (nums[i]! + nums[j]! === target) slow = [i, j];
  // The inward rule as written in the listing; on unsorted numbers it can miss a pair, and that's what it returns.
  let pattern: number[] | null = null;
  for (let lo = 0, hi = nums.length - 1; lo < hi && !pattern; ) {
    const s = nums[lo]! + nums[hi]!;
    if (s === target) pattern = [lo, hi];
    else if (s < target) lo++;
    else hi--;
  }
  const dedupe = nums.filter((x, i) => i === 0 || x !== nums[i - 1]).length;
  return { slow, dedupe, pattern };
}
const preset = (id: string, label: string, nums: number[], target: number, edge?: "empty" | "one" | "dupes" | "worst") => ({
  id,
  label,
  input: { nums, target },
  expect: null,
  expectByRun: answers(nums, target),
  ...(edge ? { edge } : {}),
});
const at = (f: Frame, name: string) => f.pointers.find((p) => p.name === name)?.at;

/** Lesson 5: on a sorted array, two pointers close in from both ends; a reader and a writer walk the same way. */
export const twoPointers: DsaLesson = {
  id: "dsa-two-pointers",
  home: "dsa",
  slug: "two-pointers",
  topic: "Two pointers",
  title: "Close in from both ends",
  promise: "Two markers walk inward on a sorted array: n steps instead of n².",
  minutes: 10,
  level: 1,
  runs: {
    slow: { algo: "everyPair", label: "Every pair", listing: "every-pair", time: "O(n²)", space: "O(1)" },
    dedupe: { algo: "dedupe", label: "Reader and writer", listing: "dedupe", time: "O(n)", space: "O(1)", args: ["nums"] },
    pattern: { algo: "inward", label: "Two pointers", listing: "inward", time: "O(n)", space: "O(1)" },
  },
  presets: [
    preset("example", "1, 3, 4, 6, 8, 11 → 10", [1, 3, 4, 6, 8, 11], 10),
    preset("dupes", "1, 1, 2, 2, 2, 3, 5, 5 → 6", [1, 1, 2, 2, 2, 3, 5, 5], 6, "dupes"),
    preset("unsorted", "3, 8, 1, 9, 4, 6 → 10", [3, 8, 1, 9, 4, 6], 10),
    preset("worst", "1 to 16 → 40", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16], 40, "worst"),
    preset("one", "One number", [5], 10, "one"),
    preset("empty", "Empty list", [], 5, "empty"),
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
      title: "Two Sum on sorted numbers",
      short: "Sorted",
      text: [
        "Same question as lesson 1: which two numbers add up to the target? This time the numbers are **sorted**, smallest first.",
        "Can the order do some of the work?",
      ],
      run: "slow",
      preset: "example",
      to: "start",
    },
    {
      id: "every-pair",
      part: "slow",
      title: "Every pair ignores the order",
      short: "Every pair",
      text: [
        "Trying every pair finds 4 + 6 after {slowSteps} checks, and it would do the same on shuffled numbers: the sorting is wasted.",
        "Lesson 4's map gets there in one pass, but it costs O(n) extra space.",
      ],
      run: "slow",
      preset: "example",
    },
    {
      id: "inward",
      part: "pattern",
      title: "Close in from both ends",
      short: "Two pointers",
      text: [
        "Put **lo** on the smallest number and **hi** on the largest. Add them. Too small? Only a bigger left number can help, so lo moves right. Too big? hi moves left.",
        "Here that's {patternSteps} checks, each one moving a pointer: O(n) time and O(1) space.",
      ],
      run: "pattern",
      preset: "example",
      predict: {
        at: { site: "check", nth: 1 },
        ask: "1 + 11 = 12 is too big for 10. Which pointer moves?",
        options: ["hi, left to 8", "lo, right to 3", "Both"],
        answer: 0,
        check: (f) => (at(f, "lo") === 0 && at(f, "hi") === 4 ? 0 : at(f, "lo") === 1 && at(f, "hi") === 5 ? 1 : 2),
      },
    },
    {
      id: "why",
      part: "pattern",
      title: "Why dropping an end is safe",
      short: "Why it works",
      text: [
        "1 is the smallest number left, and 1 + 11 is already too big. So 11 is too big with **every** number left: it can't be in the answer, and hi can drop it for good.",
        "Each check rules out a whole end like this, so the pointers meet after at most n − 1 checks without ever skipping the answer.",
      ],
      run: "pattern",
      preset: "example",
      to: { site: "hi", nth: 1 },
    },
    {
      id: "compare",
      part: "pattern",
      title: "n checks instead of n²",
      short: "Compare",
      text: ["16 numbers with no pair: every pair makes {slowSteps} checks, two pointers {patternSteps}. Doubling n quadruples the first and only doubles the second."],
      run: "pattern",
      preset: "worst",
      compare: ["slow", "pattern"],
    },
    {
      id: "dedupe",
      part: "pattern",
      title: "Same direction: a reader and a writer",
      short: "Reader, writer",
      text: [
        "Two pointers can also walk the same way. To remove duplicates from sorted numbers, **r** reads every number and **w** marks where the next new one goes.",
        "A number that differs from the last one kept is written at w. That's {dedupeSteps} steps for 8 numbers, in place: O(n) time, O(1) space.",
      ],
      run: "dedupe",
      preset: "dupes",
      predict: {
        at: { site: "keep", nth: 1 },
        ask: "2 was written at position 1. r moves on and reads another 2. What happens to it?",
        options: ["Skipped: it matches the last number kept", "Written at w"],
        answer: 0,
        check: (f) => (f.site === "skip" ? 0 : 1),
      },
    },
    {
      id: "breaks",
      part: "breaks",
      title: "Unsorted numbers break the rule",
      short: "Breaks",
      text: [
        "3, 8, 1, 9, 4, 6 isn't sorted. The pointers close in and meet without ever trying 1 + 9, which is the answer. Dropping an end is only safe because of the order.",
        "You could sort first, at O(n log n), but sorting moves the numbers. When you need the original positions, lesson 4's map is the better tool.",
      ],
      run: "pattern",
      preset: "unsorted",
    },
    {
      id: "spot",
      part: "spot",
      title: "When to reach for two pointers",
      short: "Spot it",
      text: ["Reach for two pointers on a sorted array when the question is about a pair, or when you must rearrange in place. The card sums it up."],
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
        "Two Sum II is this lesson's inward walk. Container With Most Water moves the shorter side inward. Remove Duplicates and Move Zeroes use a reader and a writer. 3Sum fixes one number and runs two pointers on the rest.",
      ],
      run: "dedupe",
      preset: "dupes",
      from: "end",
    },
    {
      id: "recap",
      part: "recap",
      title: "What to remember",
      short: "Recap",
      text: ["On sorted numbers, two pointers from the ends find a pair in O(n) time and O(1) space: each check drops one end that can't be in the answer. A reader and a writer walking the same way rearrange in place."],
      run: "pattern",
      preset: "worst",
      from: "end",
    },
  ],
  card: {
    signal: "A sorted array and a question about pairs, or rearranging items in place",
    reachFor: "Two pointers: one at each end moving inward, or a reader and a writer moving the same way",
    askYourself: "When this pair is wrong, which end can I drop for good, and why?",
    whyItWorks: "In sorted order, a sum that's too big stays too big for that right end, so it can never be in the answer",
    trap: "Unsorted input breaks the rule; sorting first costs O(n log n) and loses the original positions",
  },
  practice: [
    { slug: "two-sum-ii-input-array-is-sorted", core: true },
    { slug: "container-with-most-water", core: true },
    { slug: "remove-duplicates-from-sorted-array", core: true },
    { slug: "move-zeroes", core: true },
    { slug: "3sum", core: false },
  ],
  ask: ["Is the array sorted?", "Do you need the original positions?", "Can the same number appear more than once?"],
  buildsOn: ["dsa-arrays-big-o"],
  questions: [],
  cheatsheet: [
    { heading: "From both ends", text: ["lo = 0, hi = n − 1. While lo < hi: too small, lo++; too big, hi--. O(n) time, O(1) space. Needs sorted input, or some rule that says which end can go."] },
    { heading: "Same direction", text: ["r reads every item; w marks where the next keeper goes. Remove duplicates, move zeroes, merge sorted arrays."] },
    { heading: "Sort first?", text: ["Sorting costs O(n log n) and changes positions. If you need the original positions, a hash map is O(n)."] },
  ],
};
