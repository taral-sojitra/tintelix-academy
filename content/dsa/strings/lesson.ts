import type { DsaLesson, Frame } from "@tintelix/schema";

/** Each run's answer worked out with plain string code, so the presets don't trust the traced algorithms. */
function answers(s: string, t: string) {
  const palindrome = s === [...s].reverse().join("");
  const sorted = (x: string) => [...x].sort().join("");
  return { reverse: palindrome, indices: palindrome, counts: sorted(s) === sorted(t) };
}
const preset = (id: string, label: string, s: string, t: string, edge?: "empty" | "one" | "none" | "worst") => ({
  id,
  label,
  input: { s, t },
  expect: null,
  expectByRun: answers(s, t),
  ...(edge ? { edge } : {}),
});
const pointer = (f: Frame, name: string) => f.pointers.find((p) => p.name === name)?.at;
const count = (f: Frame, key: string) => {
  const m = f.structs.counts as Extract<Frame["structs"][string], { kind: "map" }>;
  return m.entries.find(([k]) => k === key)?.[1];
};

/** Lesson 3: a string is an array of letters; two indices check a palindrome, letter counts check an anagram. */
export const strings: DsaLesson = {
  id: "dsa-strings",
  home: "dsa",
  slug: "strings",
  topic: "Strings",
  title: "Is it a palindrome?",
  promise: "Two indices meet in the middle to check a palindrome; letter counts reveal anagrams.",
  minutes: 10,
  level: 1,
  runs: {
    reverse: { algo: "reverseCompare", label: "Copy it backwards", listing: "reverse", time: "O(n)", space: "O(n)", args: ["s"] },
    counts: { algo: "letterCounts", label: "Count the letters", listing: "counts", time: "O(n)", space: "O(1): 26 letters at most" },
    indices: { algo: "twoIndices", label: "Two indices", listing: "indices", time: "O(n)", space: "O(1)", args: ["s"] },
  },
  presets: [
    preset("example", "racecar · carrace", "racecar", "carrace"),
    preset("listen", "listen · silent", "listen", "silent"),
    preset("none", "rocket · pocket", "rocket", "pocket", "none"),
    preset("one", "a · ab", "a", "ab", "one"),
    preset("empty", "Two empty words", "", "", "empty"),
    preset("worst", "24 letters", "abcdefghijkllkjihgfedcba", "lkjihgfedcbaabcdefghijkl", "worst"),
  ],
  input: {
    s: { kind: "text", label: "Word", alphabet: "a-z", length: [0, 24] },
    t: { kind: "text", label: "Second word, for anagrams", alphabet: "a-z", length: [0, 24] },
  },
  counter: "Steps",
  steps: [
    {
      id: "problem",
      part: "problem",
      title: "A string is an array of letters",
      short: "Strings",
      text: [
        "A string keeps its letters in numbered cells, just like an array: s[3] is one step away.",
        "A **palindrome** reads the same both ways, like racecar. The question: is this string one?",
      ],
      run: "indices",
      preset: "example",
      to: "start",
    },
    {
      id: "copy",
      part: "slow",
      title: "Copy it backwards, then compare",
      short: "Copy first",
      text: [
        "The obvious way: write the letters out backwards, then compare the copy with the original, position by position.",
        "For 7 letters that's {reverseSteps} steps, 7 to copy and 7 to compare. That's O(n) time, but the copy costs O(n) extra space.",
      ],
      run: "reverse",
      preset: "example",
    },
    {
      id: "indices",
      part: "pattern",
      title: "Two indices walk in from the ends",
      short: "Two indices",
      text: [
        "Put **i** on the first letter and **j** on the last. If they match, step both inward; stop when they meet.",
        "Every letter is compared with its mirror once, so that's {indicesSteps} steps for 7 letters, with no copy: O(n) time, O(1) space.",
      ],
      run: "indices",
      preset: "example",
      predict: {
        at: { site: "compare", nth: 1 },
        ask: "r matches r. Where do i and j go next?",
        options: ["i to 1, j to 5", "i to 1, j stays at 6", "Both stay put"],
        answer: 0,
        check: (f) => {
          const i = pointer(f, "i");
          const j = pointer(f, "j");
          return i === 1 && j === 5 ? 0 : i === 1 && j === 6 ? 1 : 2;
        },
      },
    },
    {
      id: "compare",
      part: "pattern",
      title: "Half the comparisons, none of the copying",
      short: "Compare",
      text: ["24 letters: copying first takes {reverseSteps} steps, two indices {indicesSteps}. Both are O(n), but one does a quarter of the work and needs no extra space."],
      run: "indices",
      preset: "worst",
      compare: ["reverse", "indices"],
    },
    {
      id: "early",
      part: "pattern",
      title: "Stop at the first mismatch",
      short: "Stop early",
      text: [
        "rocket fails on its very first pair, r against t. Two indices stop after {indicesSteps} step.",
        "Copying first has already spent {reverseSteps} steps before it compares anything.",
      ],
      run: "indices",
      preset: "none",
      compare: ["reverse", "indices"],
    },
    {
      id: "breaks",
      part: "breaks",
      title: "When the order doesn't matter",
      short: "Breaks",
      text: [
        "listen and silent hold the same letters, so they're **anagrams**. But l and n don't match at the ends, and walking positions says nothing useful.",
        "Mirrored positions answer \"does it read the same backwards?\", not \"same letters, any order?\". That needs counting.",
      ],
      run: "indices",
      preset: "listen",
    },
    {
      id: "counts",
      part: "pattern",
      title: "Count up for one word, down for the other",
      short: "Letter counts",
      text: [
        "Add one to a letter's count for each letter of the first word, then take one away for each letter of the second. Anagrams cancel out: every count ends at 0.",
        "That's {countsSteps} steps for two 6-letter words: O(n) time. There are only 26 letters, so the counts take O(1) space.",
      ],
      run: "counts",
      preset: "listen",
      predict: {
        at: { site: "count", nth: 6 },
        ask: "All of listen is counted. silent starts with s: what does s's count become?",
        options: ["0", "1", "−1"],
        answer: 0,
        check: (f) => (count(f, "s") === 0 ? 0 : count(f, "s") === 1 ? 1 : 2),
      },
    },
    {
      id: "lengths",
      part: "pattern",
      title: "Check the lengths first",
      short: "Lengths",
      text: ["Words of different lengths can't be anagrams, so a one-line check answers \"a\" against \"ab\" before any counting."],
      run: "counts",
      preset: "one",
      note: { kind: "tip", text: "Ask up front whether case, spaces and punctuation count. \"Race car\" is a palindrome only if you skip the space." },
    },
    {
      id: "spot",
      part: "spot",
      title: "When to reach for each",
      short: "Spot it",
      text: ["Two indices from the ends when a string is compared with itself backwards; letter counts when only how many of each letter matters. The card sums it up."],
      run: "indices",
      preset: "example",
      from: "end",
    },
    {
      id: "practice",
      part: "practice",
      title: "Your turn",
      short: "Practice",
      text: ["Valid Palindrome and Reverse Vowels walk two indices in from the ends, skipping what doesn't count. Valid Anagram and Ransom Note count letters."],
      run: "counts",
      preset: "listen",
      from: "end",
    },
    {
      id: "recap",
      part: "recap",
      title: "What to remember",
      short: "Recap",
      text: ["A string is an array of letters. Two indices meeting in the middle check a palindrome in O(n) time and O(1) space. Letter counts, up for one word and down for the other, check an anagram."],
      run: "indices",
      preset: "worst",
      from: "end",
    },
  ],
  card: {
    signal: "A string checked against itself backwards, or two strings with the same letters in any order",
    reachFor: "Two indices walking in from both ends; or one count per letter, up for one word, down for the other",
    askYourself: "Does the order of the letters matter, or only how many of each?",
    whyItWorks: "Letter i of a palindrome mirrors letter n − 1 − i, so meeting in the middle checks each pair once",
    trap: "Check lengths first for anagrams, and settle case, spaces and punctuation before you start",
  },
  practice: [
    { slug: "valid-palindrome", core: true },
    { slug: "valid-anagram", core: true },
    { slug: "reverse-vowels-of-a-string", core: true },
    { slug: "ransom-note", core: false },
  ],
  ask: ["Does case matter, and do spaces and punctuation count?", "Only the letters a to z, or any character?", "Can a string be empty?"],
  buildsOn: ["dsa-arrays-big-o"],
  questions: [],
  cheatsheet: [
    { heading: "Strings are arrays", text: ["Reading s[i] is O(1). Building a new string one letter at a time can cost O(n) per step in some languages: collect letters in a list, then join once."] },
    { heading: "Two indices from the ends", text: ["i from the start, j from the end; compare, then step both inward until they meet. O(n) time, O(1) space, and it stops at the first mismatch."] },
    { heading: "Letter counts", text: ["Up for one word, down for the other; anagrams end with every count at 0. Check the lengths first. 26 letters means O(1) space."] },
  ],
};
