import type { DsaLesson, Frame } from "@tintelix/schema";

/** Each run's answer worked out with plain code, so the presets don't trust the traced algorithms. */
function answers(s: string, temps: number[], pings: number[]) {
  let rest = s;
  for (let before = ""; before !== rest; ) {
    before = rest;
    rest = rest.replace(/\(\)|\[\]|\{\}/g, "");
  }
  const wait = temps.map((x, i) => {
    const j = temps.findIndex((y, k) => k > i && y > x);
    return j < 0 ? 0 : j - i;
  });
  const counts = pings.map((p) => pings.filter((q) => q <= p && q >= p - 3000).length);
  return { slow: rest === "", queue: counts, scan: wait, mono: wait, pattern: rest === "" };
}
const preset = (id: string, label: string, s: string, temps: number[], pings: number[], edge?: "empty" | "one" | "none" | "worst") => ({
  id,
  label,
  input: { s, temps, pings },
  expect: null,
  expectByRun: answers(s, temps, pings),
  ...(edge ? { edge } : {}),
});
type Stack = Extract<Frame["structs"][string], { kind: "stack" }>;
const stackOf = (f: Frame, id: string) => f.structs[id] as Stack;

/** Lesson 11: last in first out, first in first out, and the monotonic stack. */
export const stacksQueues: DsaLesson = {
  id: "dsa-stacks-queues",
  home: "dsa",
  slug: "stacks-queues",
  topic: "Stacks and queues",
  title: "Do the brackets match?",
  promise: "Last in first out, first in first out, and the monotonic stack.",
  minutes: 14,
  level: 2,
  runs: {
    slow: { algo: "removePairs", label: "Delete pairs", listing: "remove-pairs", time: "O(n²)", space: "O(n)", args: ["s"] },
    queue: { algo: "recentCalls", label: "Recent calls", listing: "recent", time: "O(n)", space: "O(n)", args: ["pings"] },
    scan: { algo: "scanAhead", label: "Look ahead", listing: "look-ahead", time: "O(n²)", space: "O(1) besides the answer", args: ["temps"] },
    mono: { algo: "monotonic", label: "Monotonic stack", listing: "monotonic", time: "O(n)", space: "O(n)", args: ["temps"] },
    pattern: { algo: "bracketStack", label: "Stack", listing: "brackets", time: "O(n)", space: "O(n)", args: ["s"] },
  },
  presets: [
    preset("example", "{[()()]}", "{[()()]}", [73, 74, 75, 71, 69, 72, 76, 73], [1, 100, 3001, 3002]),
    preset("crossed", "([)]", "([)]", [30, 40, 50, 60], [1, 2000, 4000, 6500], "none"),
    preset("open", "((", "((", [55, 50, 45], [10, 20], "none"),
    preset("worst", "8 deep", "(((((((())))))))", [76, 75, 74, 73, 72, 71, 70, 99], [1, 1000, 2000, 3000, 4000, 5000, 6000, 7000], "worst"),
    preset("one", "(", "(", [50], [5], "one"),
    preset("empty", "Nothing", "", [], [], "empty"),
  ],
  input: {
    s: { kind: "text", label: "Brackets", alphabet: "brackets", length: [0, 16] },
    temps: { kind: "ints", label: "Temperatures", min: 0, max: 120, length: [0, 8] },
    pings: { kind: "ints", label: "Ping times (ms)", min: 1, max: 9999, length: [0, 8], sorted: true, distinct: true },
  },
  counter: "Steps",
  steps: [
    {
      id: "problem",
      part: "problem",
      title: "Do the brackets match?",
      short: "Brackets",
      text: ["Every opening bracket must be closed by the same kind, innermost first. {[()()]} matches; ([)] doesn't, because ) arrives while [ is still open."],
      run: "pattern",
      preset: "example",
      to: "start",
    },
    {
      id: "delete",
      part: "slow",
      title: "Delete pairs until nothing's left",
      short: "Delete pairs",
      text: [
        "Find a matched pair sitting side by side, like (), delete it, and read the brackets again. If nothing is left at the end, they matched.",
        "That's {slowSteps} brackets read for 8: every deletion starts the reading over, O(n²).",
      ],
      run: "slow",
      preset: "example",
    },
    {
      id: "stack",
      part: "pattern",
      title: "Last in, first out",
      short: "Stack",
      text: [
        "Push each opener onto a **stack**. A closer must match the opener on top, because the last bracket opened is the first one closed. If it matches, pop it.",
        "That's {patternSteps} steps, one per bracket: O(n). An empty stack at the end means everything matched.",
      ],
      run: "pattern",
      preset: "example",
      predict: {
        at: { site: "push", nth: 3 },
        ask: "{, [ and ( are on the stack. Next comes ). Which bracket does it close?",
        options: ["The ( on top", "The { at the bottom", "The [ in the middle"],
        answer: 0,
        check: (f) => {
          const items = stackOf(f, "stack").items;
          return items.join("") === "{[" ? 0 : items.join("") === "[(" ? 1 : 2;
        },
      },
    },
    {
      id: "crossed",
      part: "pattern",
      title: "When the top doesn't match",
      short: "No match",
      text: ["In ([)], the ) arrives while [ is on top. The stack catches it at once: {patternSteps} steps and the answer is no."],
      run: "pattern",
      preset: "crossed",
    },
    {
      id: "queue",
      part: "pattern",
      title: "First in, first out",
      short: "Queue",
      text: [
        "A **queue** serves the oldest first. To count the pings in the last 3000 ms, add each new ping at the back and drop pings from the front that are too old.",
        "Pings arrive in time order, so the oldest is always at the front: {queueSteps} steps, each ping joining once and leaving at most once.",
      ],
      run: "queue",
      preset: "example",
    },
    {
      id: "temps",
      part: "problem",
      title: "How long until it's warmer?",
      short: "Warmer",
      text: ["For each day, how many days until a warmer one? 0 if none comes. For 73, 74, 75, 71, 69, 72, 76, 73 the answer starts 1, 1, 4."],
      run: "scan",
      preset: "example",
      to: "start",
    },
    {
      id: "look-ahead",
      part: "slow",
      title: "Look ahead from every day",
      short: "Look ahead",
      text: ["From each day, look ahead until it's warmer: {scanSteps} comparisons here. When the warm day comes late, every day looks at almost every other: O(n²)."],
      run: "scan",
      preset: "example",
    },
    {
      id: "mono",
      part: "pattern",
      title: "A stack of days still waiting",
      short: "Monotonic",
      text: [
        "Keep the days still waiting for warmth on a stack. A new day pops every cooler day off the top (it's their answer), then waits itself.",
        "The stack is always warmest at the bottom, coolest on top: a **monotonic stack**. Each day is pushed once and popped once: {monoSteps} steps.",
      ],
      run: "mono",
      preset: "example",
      predict: {
        at: { site: "push", nth: 5 },
        ask: "75, 71 and 69 are waiting. 72 arrives. What leaves the stack first?",
        options: ["69, on top", "75, at the bottom", "Nothing: 72 just waits"],
        answer: 0,
        check: (f) => (f.site === "resolve" && stackOf(f, "waiting").items.at(-1) === "3: 71" ? 0 : f.site === "push" ? 2 : 1),
      },
    },
    {
      id: "compare",
      part: "pattern",
      title: "When the warm day comes last",
      short: "Compare",
      text: ["Seven cooling days, then 99: looking ahead takes {scanSteps} comparisons, the monotonic stack {monoSteps} steps."],
      run: "mono",
      preset: "worst",
      compare: ["scan", "mono"],
    },
    {
      id: "spot",
      part: "spot",
      title: "When to reach for a stack or a queue",
      short: "Spot it",
      text: ["Reach for a stack when the newest unfinished thing is the one to deal with next, and a queue when the oldest is. The card sums it up."],
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
        "Valid Parentheses is this lesson's stack. Removing Stars From a String pops on every star. Daily Temperatures is the monotonic stack, and Number of Recent Calls the queue.",
      ],
      run: "mono",
      preset: "example",
      from: "end",
    },
    {
      id: "recap",
      part: "recap",
      title: "What to remember",
      short: "Recap",
      text: ["A stack hands back the newest item first: matching brackets, undo, unfinished work. A queue hands back the oldest. A monotonic stack keeps waiting items in order, so each is pushed and popped once: O(n) for the next bigger value."],
      run: "pattern",
      preset: "worst",
      from: "end",
    },
  ],
  card: {
    signal: "Matching pairs, the most recent unfinished item, or the next bigger value to the right",
    reachFor: "A stack for last in, first out; a queue for first in, first out; a monotonic stack for the next bigger",
    askYourself: "Is the item I need to deal with next the newest one, or the oldest?",
    whyItWorks: "A stack keeps unfinished work with the newest on top, so each item is pushed once and popped once",
    trap: "Check the stack isn't empty before popping, and check what's still on it at the end",
  },
  practice: [
    { slug: "valid-parentheses", core: true },
    { slug: "removing-stars-from-a-string", core: true },
    { slug: "daily-temperatures", core: true },
    { slug: "number-of-recent-calls", core: true },
    { slug: "asteroid-collision", core: false },
  ],
  ask: ["Can the input be empty?", "Which characters can appear?", "Do I need the answer for every item, or just one?"],
  buildsOn: ["dsa-linked-lists"],
  questions: [],
  cheatsheet: [
    { heading: "Stack", text: ["Push and pop at the top: O(1). Use it for matching, undo, and anything where the newest unfinished item comes next."] },
    { heading: "Queue", text: ["Join at the back, leave from the front: O(1) with a real queue (a deque in Python; JavaScript's shift is O(n), so use an index or a ring for big inputs)."] },
    { heading: "Monotonic stack", text: ["For each item: while it beats the top, pop the top (that's the top's answer); then push it. The next bigger or smaller value for every item in O(n)."] },
  ],
};
