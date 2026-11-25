import type { DsaLesson, Frame } from "@tintelix/schema";

/** Each run's answer worked out with plain string code, so the presets don't trust the traced algorithms. */
function answers(s: string, k: number) {
  const vowels = (x: string) => [...x].filter((c) => "aeiou".includes(c)).length;
  let fixed = 0;
  for (let i = 0; i + k <= s.length; i++) fixed = Math.max(fixed, vowels(s.slice(i, i + k)));
  let longest = 0;
  for (let i = 0; i < s.length; i++) for (let j = i; j < s.length; j++) if (new Set(s.slice(i, j + 1)).size === j - i + 1) longest = Math.max(longest, j - i + 1);
  return { fixed, slow: longest, pattern: longest };
}
const preset = (id: string, label: string, s: string, k: number, edge?: "empty" | "one" | "dupes" | "worst") => ({
  id,
  label,
  input: { s, k },
  expect: null,
  expectByRun: answers(s, k),
  ...(edge ? { edge } : {}),
});
const at = (f: Frame, name: string) => f.pointers.find((p) => p.name === name)?.at;

/** Lesson 6: a fixed window slides; a window that grows and shrinks finds the longest run with no repeats. */
export const slidingWindow: DsaLesson = {
  id: "dsa-sliding-window",
  home: "dsa",
  slug: "sliding-window",
  topic: "Sliding window",
  title: "The longest run with no repeats",
  promise: "A window slides, then grows and shrinks across a string.",
  minutes: 12,
  level: 2,
  runs: {
    fixed: { algo: "fixedWindow", label: "Fixed window", listing: "fixed", time: "O(n)", space: "O(1)" },
    slow: { algo: "everyStart", label: "Start again everywhere", listing: "restart", time: "O(n²)", space: "O(1): 26 letters", args: ["s"] },
    pattern: { algo: "growShrink", label: "Grow and shrink", listing: "window", time: "O(n)", space: "O(1): 26 letters", args: ["s"] },
  },
  presets: [
    preset("example", "abcabcbb", "abcabcbb", 3),
    preset("vowels", "abciiidef · k 3", "abciiidef", 3),
    preset("dupes", "bbbbb", "bbbbb", 2, "dupes"),
    preset("worst", "a to p, no repeats", "abcdefghijklmnop", 4, "worst"),
    preset("one", "One letter", "a", 1, "one"),
    preset("empty", "Empty string", "", 1, "empty"),
  ],
  input: {
    s: { kind: "text", label: "Letters", alphabet: "a-z", length: [0, 24] },
    k: { kind: "int", label: "Window k", min: 1, max: 8 },
  },
  counter: "Steps",
  steps: [
    {
      id: "windows",
      part: "problem",
      title: "A window over a string",
      short: "Windows",
      text: [
        "Which 3 neighbouring letters of abciiidef hold the most vowels? A **window** is a run of neighbouring cells, here 3 wide.",
        "Lesson 2 added up every window from scratch. A window can slide instead.",
      ],
      run: "fixed",
      preset: "vowels",
      to: "start",
    },
    {
      id: "slide",
      part: "pattern",
      title: "Slide: one letter in, one letter out",
      short: "Slide",
      text: [
        "Count the vowels in the first 3 letters. Then each slide adds the letter coming in and takes away the one going out.",
        "That's {fixedSteps} steps for 9 letters: k to fill, then one per slide, O(n) whatever k is.",
      ],
      run: "fixed",
      preset: "vowels",
      predict: {
        at: { site: "fill", nth: 3 },
        ask: "abc holds 1 vowel. The window slides: i comes in, a goes out. How many vowels now?",
        options: ["1", "2", "0"],
        answer: 0,
        check: (f) => (f.vars.vowels === 1 ? 0 : f.vars.vowels === 2 ? 1 : 2),
      },
    },
    {
      id: "problem",
      part: "problem",
      title: "The longest run with no repeats",
      short: "No repeats",
      text: ["Now the window's size isn't fixed. In abcabcbb, what's the longest run of neighbouring letters with no letter twice? Here it's abc: 3 letters."],
      run: "slow",
      preset: "example",
      to: "start",
    },
    {
      id: "restart",
      part: "slow",
      title: "Start again from every position",
      short: "Restart",
      text: [
        "The obvious way: from each position, walk right until a letter repeats, then start again from the next position, forgetting everything.",
        "That's {slowSteps} looks for 8 letters. Each restart re-reads letters it has just seen: O(n²).",
      ],
      run: "slow",
      preset: "example",
    },
    {
      id: "grow-shrink",
      part: "pattern",
      title: "Grow on the right, shrink on the left",
      short: "Grow, shrink",
      text: [
        "Keep one window. **right** adds the next letter. If that letter is already inside, **left** drops letters until the repeat is gone, and the window carries on. It never starts over.",
        "That's {patternSteps} steps here: each letter is added once and dropped at most once, so at most 2n.",
      ],
      run: "pattern",
      preset: "example",
      predict: {
        at: { site: "grow", nth: 3 },
        ask: "The window is abc. Next comes a, which is already inside. What happens?",
        options: ["left drops the first a, then a joins", "The window starts over at the new a", "The new a is skipped"],
        answer: 0,
        check: (f) => (f.site === "shrink" && at(f, "left") === 1 ? 0 : at(f, "left") === 3 ? 1 : 2),
      },
    },
    {
      id: "compare",
      part: "pattern",
      title: "Never starting over",
      short: "Compare",
      text: ["16 letters with no repeats: starting again everywhere takes {slowSteps} looks, the window {patternSteps}. The window only ever moves forward."],
      run: "pattern",
      preset: "worst",
      compare: ["slow", "pattern"],
    },
    {
      id: "busy",
      part: "pattern",
      title: "Even the busiest shrinking is O(n)",
      short: "Busy",
      text: ["In bbbbb every new b forces the old one out, so the window never grows past 1. That's still only {patternSteps} steps: every b enters once and leaves once."],
      run: "pattern",
      preset: "dupes",
    },
    {
      id: "breaks",
      part: "breaks",
      title: "When shrinking can't fix it",
      short: "Breaks",
      text: [
        "A window works when a bad window can only be fixed by shrinking it: adding letters never removes a repeat.",
        "Ask for a run of numbers adding up to exactly k, with negative numbers allowed, and that's no longer true: growing can bring a sum back down. The window can't tell which way to move, so use lesson 4's running sum instead.",
      ],
      run: "pattern",
      preset: "example",
      from: "end",
    },
    {
      id: "spot",
      part: "spot",
      title: "When to reach for a window",
      short: "Spot it",
      text: ["Reach for a sliding window when the question asks for the best run of neighbouring items: longest, shortest, or a fixed size. The card sums it up."],
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
        "Longest Substring Without Repeating Characters is this lesson's grow and shrink. Maximum Number of Vowels is the fixed slide. Minimum Size Subarray Sum shrinks while the sum is big enough. Max Consecutive Ones III allows k bad items inside the window.",
      ],
      run: "fixed",
      preset: "vowels",
      from: "end",
    },
    {
      id: "recap",
      part: "recap",
      title: "What to remember",
      short: "Recap",
      text: ["A fixed window slides: one item in, one out. A variable window grows on the right and shrinks on the left until it follows the rule again. Each item enters and leaves once, so it's O(n)."],
      run: "pattern",
      preset: "worst",
      from: "end",
    },
  ],
  card: {
    signal: "The best run of neighbouring items in an array or string: longest, shortest, or a fixed size",
    reachFor: "A sliding window: right grows it one item at a time; left shrinks it until the rule holds again",
    askYourself: "When the window breaks the rule, does dropping items from the left always fix it?",
    whyItWorks: "Each item enters once and leaves once, so the window does at most 2n moves and never starts over",
    trap: "It needs a rule that only gets worse as the window grows; sums with negative numbers need a running sum",
  },
  practice: [
    { slug: "longest-substring-without-repeating-characters", core: true },
    { slug: "maximum-number-of-vowels-in-a-substring-of-given-length", core: true },
    { slug: "minimum-size-subarray-sum", core: true },
    { slug: "max-consecutive-ones-iii", core: true },
    { slug: "minimum-window-substring", core: false },
  ],
  ask: ["Must the run be neighbouring items, or any subset?", "A fixed length, or any length?", "Can the numbers be negative?"],
  buildsOn: ["dsa-hashing", "dsa-two-pointers"],
  questions: [],
  cheatsheet: [
    { heading: "Fixed size k", text: ["Fill the first k, then each slide adds the item coming in and removes the one going out. O(n)."] },
    { heading: "Grow and shrink", text: ["For each right: add it; while the window breaks the rule, remove the left item and move left on; then update the best. O(n): each item enters and leaves once."] },
    { heading: "When not to", text: ["The rule must only get worse as the window grows. Sums with negative numbers break that: use a running sum and a map instead."] },
  ],
};
