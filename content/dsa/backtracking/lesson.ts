import type { DsaLesson } from "@tintelix/schema";

/** Each run's answer worked out with plain loops, so the presets don't trust the traced algorithms. */
function answers(nums: number[], n: number) {
  // Subsets in take-first order: masks from all-taken down to none, the first number as the top bit.
  const subsets: number[][] = [];
  for (let m = 2 ** nums.length - 1; m >= 0; m--) subsets.push(nums.filter((_, i) => m & (1 << (nums.length - 1 - i))));
  // The first safe board in counting order is also the first that row-by-row backtracking reaches.
  let first: number[] | null = null;
  for (let k = 0; k < n ** n && !first; k++) {
    const cols = Array.from({ length: n }, (_, r) => Math.floor(k / n ** (n - 1 - r)) % n);
    if (cols.every((c, r) => cols.every((d, q) => q === r || (c !== d && Math.abs(c - d) !== Math.abs(r - q))))) first = cols;
  }
  return { subsets, slow: first, pattern: first };
}
const preset = (id: string, label: string, nums: number[], n: number, edge?: "empty" | "one" | "none" | "worst") => ({
  id,
  label,
  input: { nums, n },
  expect: null,
  expectByRun: answers(nums, n),
  ...(edge ? { edge } : {}),
});

/** Lesson 9: subsets as include-or-skip forks, then N queens undoing dead ends. */
export const backtracking: DsaLesson = {
  id: "dsa-backtracking",
  home: "dsa",
  slug: "backtracking",
  topic: "Backtracking",
  title: "Try, fail, undo, try again",
  promise: "Subsets as include-or-skip forks, then N queens undoing dead ends.",
  minutes: 14,
  level: 2,
  runs: {
    subsets: { algo: "subsets", label: "Subsets", listing: "subsets", time: "O(2ⁿ · n)", space: "O(n) besides the answer", args: ["nums"] },
    slow: { algo: "everyBoard", label: "Every board", listing: "every-board", time: "O(nⁿ · n²)", space: "O(n)", args: ["n"] },
    pattern: { algo: "backtrack", label: "Backtracking", listing: "backtrack", time: "Exponential, but pruned", space: "O(n)", args: ["n"] },
  },
  presets: [
    preset("example", "1, 2, 3 · 4 queens", [1, 2, 3], 4),
    preset("none", "1, 2 · 3 queens", [1, 2], 3, "none"),
    preset("worst", "1, 2, 3, 4 · 5 queens", [1, 2, 3, 4], 5, "worst"),
    preset("one", "One number · 1 queen", [5], 1, "one"),
    preset("empty", "No numbers · 2 queens", [], 2, "empty"),
  ],
  input: {
    nums: { kind: "ints", label: "Numbers, for subsets", min: 0, max: 9, length: [0, 4] },
    n: { kind: "int", label: "Queens", min: 1, max: 5 },
  },
  counter: "Steps",
  steps: [
    {
      id: "problem",
      part: "problem",
      title: "Every subset",
      short: "Subsets",
      text: ["List every subset of 1, 2, 3: from the empty set {} to all three. There are 2 × 2 × 2 = 8, because each number is either in or out."],
      run: "subsets",
      preset: "example",
      to: "start",
    },
    {
      id: "forks",
      part: "pattern",
      title: "Take it or skip it",
      short: "Forks",
      text: [
        "For each number, fork: **take** it or **skip** it. The forks make a tree, and every leaf is one subset.",
        "One list of chosen numbers serves every branch: after exploring with a number taken, **undo** it, then explore without it. That's the whole of backtracking: choose, explore, undo.",
      ],
      run: "subsets",
      preset: "example",
      predict: {
        at: { site: "leaf", nth: 1 },
        ask: "{1, 2, 3} is recorded. What happens next?",
        options: ["Undo 3, then try skipping it", "Start again from the top", "Stop: a subset was found"],
        answer: 0,
        check: (f) => (f.site === "undo" ? 0 : f.site === "start" ? 1 : 2),
      },
    },
    {
      id: "queens",
      part: "problem",
      title: "Four queens on a 4 × 4 board",
      short: "Queens",
      text: ["Now a puzzle with rules. Place 4 queens on a 4 × 4 board so that no two share a row, a column or a diagonal."],
      run: "pattern",
      preset: "example",
      to: "start",
    },
    {
      id: "every-board",
      part: "slow",
      title: "Try every board",
      short: "Every board",
      text: [
        "One queen per row and 4 columns for each makes 4 × 4 × 4 × 4 = 256 boards. Checking them in order finds the first answer at board {slowSteps}.",
        "Most of those boards were doomed from their first two queens, but each one is still built and checked in full.",
      ],
      run: "slow",
      preset: "example",
      to: { site: "board", nth: 20 },
    },
    {
      id: "backtrack",
      part: "pattern",
      title: "Undo the dead ends",
      short: "Backtrack",
      text: [
        "Place queens row by row. Skip any square that's attacked. If a row has no safe square left, the queen above it was wrong: **undo** it and move it on.",
        "Every dead end is abandoned the moment it appears. That's {patternSteps} squares tried to place 4 queens.",
      ],
      run: "pattern",
      preset: "example",
      predict: {
        at: { site: "dead", nth: 1 },
        ask: "Row 2 has no safe square. What now?",
        options: ["Take the queen off row 1 and move it on", "Start the whole board again", "Leave row 2 empty"],
        answer: 0,
        check: (f) => (f.site === "undo" ? 0 : f.site === "start" ? 1 : 2),
      },
    },
    {
      id: "compare",
      part: "pattern",
      title: "Pruning pays",
      short: "Compare",
      text: ["5 queens: checking every board takes {slowSteps} boards; backtracking tries {patternSteps} squares, because a dead end is never built on."],
      run: "pattern",
      preset: "worst",
      compare: ["slow", "pattern"],
    },
    {
      id: "breaks",
      part: "breaks",
      title: "Still exponential underneath",
      short: "Breaks",
      text: [
        "Three queens can't fit on a 3 × 3 board, and backtracking can only say so after trying every square that's left: {patternSteps} here.",
        "Pruning cuts away dead ends but doesn't change the shape: the worst case still grows exponentially. Keep n small, or find a sharper rule that prunes more.",
      ],
      run: "pattern",
      preset: "none",
    },
    {
      id: "spot",
      part: "spot",
      title: "When to reach for backtracking",
      short: "Spot it",
      text: ["Reach for backtracking when the question asks for every arrangement that follows the rules, or one that does. The card sums it up."],
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
        "Subsets is this lesson's take-or-skip. Permutations chooses which number goes next. Combination Sum stops a branch once the total is too big. N-Queens II counts every answer instead of stopping at the first.",
      ],
      run: "subsets",
      preset: "example",
      from: "end",
    },
    {
      id: "recap",
      part: "recap",
      title: "What to remember",
      short: "Recap",
      text: ["Backtracking builds an answer one choice at a time: choose, explore, undo. Undoing lets one partial answer serve every branch. Abandoning a dead end early is what makes it faster than trying everything, though the worst case stays exponential."],
      run: "pattern",
      preset: "worst",
      from: "end",
    },
  ],
  card: {
    signal: "Every arrangement that follows the rules, or one that does: subsets, orders, placements",
    reachFor: "Backtracking: choose, explore with recursion, then undo the choice and try the next one",
    askYourself: "Can I tell a partial answer is already dead, so I stop exploring it now?",
    whyItWorks: "Undoing each choice after exploring it lets one partial answer serve every branch",
    trap: "Forget to undo and old choices leak into other branches; and the worst case stays exponential",
  },
  practice: [
    { slug: "subsets", core: true },
    { slug: "permutations", core: true },
    { slug: "combination-sum", core: true },
    { slug: "n-queens-ii", core: true },
    { slug: "letter-combinations-of-a-phone-number", core: false },
  ],
  ask: ["Do you want every answer, one answer, or how many?", "Can items repeat, and does order matter?", "How big can n get?"],
  buildsOn: ["dsa-recursion"],
  questions: [],
  cheatsheet: [
    { heading: "The shape", text: ["go(state): if the state is complete, record it. Otherwise, for each choice: make it, go(next state), undo it."] },
    { heading: "Prune early", text: ["Check the rules as each choice is made, not once the answer is complete: a dead end abandoned at depth 2 saves everything below it."] },
    { heading: "How many answers", text: ["Subsets: 2ⁿ. Orders: n!. Keep n under about 20 for subsets and 10 for orders."] },
  ],
};
