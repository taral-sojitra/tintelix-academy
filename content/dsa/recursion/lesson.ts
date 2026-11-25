import type { DsaLesson, Frame } from "@tintelix/schema";

/** Each run's answer worked out with plain loops, so the presets don't trust the traced algorithms. */
function answers(n: number) {
  let factorial = 1;
  for (let k = 2; k <= n; k++) factorial *= k;
  let [a, b] = [0, 1];
  for (let k = 0; k < n; k++) [a, b] = [b, a + b];
  return { stack: factorial, slow: a, pattern: a };
}
const preset = (id: string, label: string, n: number, edge?: "one" | "worst") => ({ id, label, input: { n }, expect: null, expectByRun: answers(n), ...(edge ? { edge } : {}) });
const topReturn = (f: Frame) => {
  const s = f.structs.calls as Extract<Frame["structs"][string], { kind: "calls" }>;
  return s.frames.at(-1)?.ret;
};
const newestCall = (f: Frame) => (f.structs.calls as Extract<Frame["structs"][string], { kind: "tree" }>).nodes.at(-1);

/** Lesson 8: call frames pile up and unwind; the Fibonacci call tree repeats itself until a memo stops it. */
export const recursion: DsaLesson = {
  id: "dsa-recursion",
  home: "dsa",
  slug: "recursion",
  topic: "Recursion",
  title: "The function that calls itself",
  promise: "Call frames pile up and unwind; the Fibonacci call tree repeats itself.",
  minutes: 12,
  level: 2,
  runs: {
    stack: { algo: "factorial", label: "Factorial", listing: "factorial", time: "O(n)", space: "O(n) stack" },
    endless: { algo: "noBase", label: "No base case", listing: "no-base", time: "Never ends", space: "Grows until it crashes", endless: true },
    slow: { algo: "fibNaive", label: "Fibonacci, plain", listing: "naive", time: "O(2ⁿ)", space: "O(n) stack" },
    pattern: { algo: "fibMemo", label: "Fibonacci with a memo", listing: "memo", time: "O(n)", space: "O(n)" },
  },
  presets: [
    preset("example", "n = 5", 5),
    preset("three", "n = 3", 3),
    preset("worst", "n = 6", 6, "worst"),
    preset("one", "n = 1", 1, "one"),
    preset("zero", "n = 0", 0),
  ],
  input: { n: { kind: "int", label: "n", min: 0, max: 6 } },
  counter: "Calls",
  steps: [
    {
      id: "problem",
      part: "problem",
      title: "The same question, one size smaller",
      short: "Smaller",
      text: [
        "5! = 5 × 4 × 3 × 2 × 1 = 120. Look closer: 5! = 5 × 4!. Working out 5! means working out 4! first, the same question one size smaller.",
        "A function can answer that by **calling itself** with the smaller input.",
      ],
      run: "stack",
      preset: "example",
      to: "start",
    },
    {
      id: "stack",
      part: "pattern",
      title: "Calls pile up, then unwind",
      short: "Call stack",
      text: [
        "Each call waits on the **call stack** for the call it made. factorial(1) is the **base case**: it answers straight away, without calling anything.",
        "That's {stackSteps} calls, 5 deep. Then the answers flow back down the stack: 1, 2, 6, 24, 120.",
      ],
      run: "stack",
      preset: "example",
      predict: {
        at: { site: "base", nth: 1 },
        ask: "factorial(1) handed back 1. What does factorial(2) return?",
        options: ["2", "1", "3"],
        answer: 0,
        check: (f) => (topReturn(f) === 2 ? 0 : topReturn(f) === 1 ? 1 : 2),
      },
    },
    {
      id: "breaks",
      part: "breaks",
      title: "No base case, no end",
      short: "Breaks",
      text: [
        "Leave out the base case and factorial(3) calls factorial(2), then 1, 0, −1, and on. Nothing ever answers, so the stack only grows.",
        "A real program crashes with a **stack overflow**. The tracer stops this one after 400 moves.",
      ],
      run: "endless",
      preset: "three",
      to: { site: "call", nth: 10 },
      note: { kind: "watch", text: "Every recursive function needs a base case, and every call must move closer to it." },
    },
    {
      id: "fib",
      part: "slow",
      title: "Fibonacci, straight from the definition",
      short: "Fibonacci",
      text: [
        "fib(n) = fib(n − 1) + fib(n − 2), with fib(0) = 0 and fib(1) = 1. Written exactly that way, fib(5) makes {slowSteps} calls.",
        "The **call tree** shows why: red calls repeat work already done. fib(3) is worked out twice, fib(2) three times.",
      ],
      run: "slow",
      preset: "example",
      predict: {
        at: { site: "ret", nth: 2 },
        ask: "fib(3) is done. fib(4) now calls fib(2). Has fib(2) been worked out before?",
        options: ["Yes: this is repeated work", "No: it's new"],
        answer: 0,
        check: (f) => (newestCall(f)?.mark === "bad" ? 0 : 1),
      },
    },
    {
      id: "memo",
      part: "pattern",
      title: "Remember answers: a memo",
      short: "Memo",
      text: [
        "Store each answer in a **memo** the first time it's worked out, and check the memo before working anything out.",
        "fib(5) now makes {patternSteps} calls. Green calls answer straight from the memo and make no calls of their own.",
      ],
      run: "pattern",
      preset: "example",
    },
    {
      id: "compare",
      part: "pattern",
      title: "Exponential against linear",
      short: "Compare",
      text: [
        "fib(6): {slowSteps} calls without the memo, {patternSteps} with it. Without it the calls grow about 1.6 times for each step of n: fib(40) needs about 331 million.",
        "With the memo, fib(n) makes 2n − 1 calls: 79 for fib(40).",
      ],
      run: "pattern",
      preset: "worst",
      compare: ["slow", "pattern"],
    },
    {
      id: "spot",
      part: "spot",
      title: "When to reach for recursion",
      short: "Spot it",
      text: ["Reach for recursion when a problem contains a smaller copy of itself, and for a memo when those copies repeat. The card sums it up."],
      run: "pattern",
      preset: "example",
      from: "end",
    },
    {
      id: "practice",
      part: "practice",
      title: "Your turn",
      short: "Practice",
      text: ["N-th Tribonacci Number and Climbing Stairs are recursion with a memo. Pow(x, n) halves n on every call. Maximum Depth of Binary Tree asks each subtree the same question."],
      run: "slow",
      preset: "three",
      from: "end",
    },
    {
      id: "recap",
      part: "recap",
      title: "What to remember",
      short: "Recap",
      text: ["A recursive function answers a base case directly and calls itself on a smaller input for the rest. Each call waits on the stack, so depth costs memory. When the same calls repeat, a memo makes each one happen once."],
      run: "pattern",
      preset: "worst",
      from: "end",
    },
  ],
  card: {
    signal: "A problem holds a smaller copy of itself: n depends on n − 1, a tree on its subtrees",
    reachFor: "Recursion: a base case answered directly, and a call on a smaller input for everything else",
    askYourself: "What's the smallest input I can answer outright, and does every call get closer to it?",
    whyItWorks: "Each call waits on the stack until the smaller answer comes back, then finishes its own part",
    trap: "No base case never ends; and the same smaller question asked twice needs a memo",
  },
  practice: [
    { slug: "n-th-tribonacci-number", core: true },
    { slug: "climbing-stairs", core: true },
    { slug: "powx-n", core: true },
    { slug: "maximum-depth-of-binary-tree", core: false },
  ],
  ask: ["How deep can the recursion go?", "Is the same smaller question asked more than once?", "What should the smallest input return?"],
  buildsOn: ["dsa-how-to-solve"],
  questions: [],
  cheatsheet: [
    { heading: "The shape", text: ["If the input is a base case, return its answer directly. Otherwise return something built from a call on a smaller input."] },
    { heading: "The call stack", text: ["Each call waits until the call it made returns. Depth n costs O(n) memory; tens of thousands of levels overflow the stack in many languages."] },
    { heading: "Memo", text: ["Store each answer the first time; check the store before working anything out. Repeated calls drop from exponential to one each."] },
  ],
};
