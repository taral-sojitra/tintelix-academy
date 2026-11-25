# DSA subject: design

Date: 2026-11-25. Taral reviewed DSA sites, problem lists and four problem-solving videos with Claude,
asked for the curriculum to be written into the HLD, then for an LLD, a review of both, and then
"start writing code". This note records what the two docs decided and the calls made to build it.

The authority is the Tintelix HLD (DSA section) and LLD §12 (Claude Docs). Claude's 11 HLD and 20 LLD
review suggestions were still waiting in the docs when building started; the build follows the docs
with those suggestions applied.

## Intent

Teach each DSA pattern and how to spot when it applies. The real algorithm runs and records every
move; the player shows those moves over a structure scene with the running code line lit, in
TypeScript or Python. Practice trains spotting and tracing; learners write code on LeetCode.

## Already decided (HLD and LLD)

- 24 lessons in 8 modules: Basics (How to solve a problem, Arrays and Big O, Strings, Hashing), Array
  patterns (Two pointers, Sliding window, Binary search), Recursion (Recursion, Backtracking), Lists,
  stacks and queues (Linked lists, Stacks and queues), Trees (Binary trees, Binary search trees, Heaps
  and priority queues, Tries), Graphs (BFS and DFS, Topological sort, Dijkstra, Union-find),
  Optimisation (DP in one dimension, DP tables, Greedy and intervals), Solving new problems (Spotting
  the pattern, A hard problem start to finish).
- Five parts per lesson: the slow way, the pattern (animated, with predictions), when to reach for it
  (a pattern card), where it breaks, practice on LeetCode.
- No code runner in version 1. TypeScript and Python listings. Presets with edge cases; custom input
  within limits (16 numbers, 24 letters, 8 × 8 grids, 15 tree nodes, 12 graph nodes).
- `packages/dsa` (tracer, structures, counter, validators, listing markers) has no React and no DOM.
  The structure scene lives in `packages/stage`, framework-free DOM and SVG. The page is
  `apps/web/ui/dsa`. Every run is traced in the browser; the build traces only to check.
- A run stops at 400 frames. A frame shows the state just after its line ran.

## Calls made while building (Claude's, open to change)

- **Listings are strings.** Each lesson's TypeScript and Python listings are template strings in
  `content/dsa/<slug>/listings.ts`, so Next bundles them without loaders. The content check
  transpiles the TypeScript listing with the `typescript` package and runs it; the Python suite pipes
  it to `python3 -I`.
- **Quoting counts.** The existing text renderer fills `{name}` with letters and digits only, so a
  step quotes a run's final count as `{slowSteps}` / `{patternSteps}` (`<run>Steps`), not
  `{steps.slow}`.
- **A `method` part.** Lesson 1 teaches the six-step method, so `DsaStep.part` gains `method` for its
  restate, clarify, examples, code and test steps.
- **Python suite location.** `content/dsa/listings.python.test.ts`, excluded from `test:content` (the
  Vercel build) and required by `pnpm check` (`REQUIRE_PYTHON=1`).
- **LeetCode registry.** `content/dsa/leetcode.ts` records each linked problem's slug, title and why
  it is known to be free (the free LeetCode study plan it appears in). Problems join the registry with
  the lesson that first links them.
- **Lesson 1 example.** Two Sum by checking every pair on [3, 8, 1, 9, 4, 6] with target 10: ten pairs
  checked before 1 + 9. Presets add the empty list, one item, a duplicate pair ([3, 3], 6), no pair,
  and a worst case of 16 numbers with no pair (120 pairs).

## Left to the builder

Exact colours and spacing within the theme; copy within the HLD's description; the order of steps
inside each part.
