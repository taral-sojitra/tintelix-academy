import type { Subject } from "@tintelix/schema";

const l = (slug: string, topic: string, title: string, summary: string, buildsOn: string[] = []) => ({
  id: `dsa-${slug}`, slug, topic, title, summary, buildsOn: buildsOn.map((b) => `dsa-${b}`),
});

const PATTERNS = ["arrays-big-o", "strings", "hashing", "two-pointers", "sliding-window", "binary-search", "recursion", "backtracking", "linked-lists", "stacks-queues", "binary-trees", "binary-search-trees", "heaps", "tries", "bfs-dfs", "topological-sort", "dijkstra", "union-find", "dp-1d", "dp-tables", "greedy-intervals"];

/** The 24 DSA lessons in eight modules (HLD, DSA section). */
export const dsa: Subject = {
  id: "dsa",
  title: "DSA",
  blurb: "Data structures and algorithms you can step through, one move at a time.",
  phase: 3,
  modules: [
    {
      title: "Basics",
      lessons: [
        l("how-to-solve", "How to solve a problem", "Solve it before you code it", "Two Sum taken through six steps, from restating it to testing the code."),
        l("arrays-big-o", "Arrays and Big O", "Why inserting at the front is slow", "Reading a cell takes one step, inserting shifts every item; prefix sums and grids.", ["how-to-solve"]),
        l("strings", "Strings", "Is it a palindrome?", "Two indices meet in the middle; letter counts reveal anagrams.", ["arrays-big-o"]),
        l("hashing", "Hashing", "Find the pair in one pass", "Keys land in buckets; Two Sum in one pass; a running sum counts subarrays.", ["arrays-big-o"]),
      ],
    },
    {
      title: "Array patterns",
      lessons: [
        l("two-pointers", "Two pointers", "Close in from both ends", "Two markers walk inward on a sorted array: n steps instead of n².", ["arrays-big-o"]),
        l("sliding-window", "Sliding window", "The longest run with no repeats", "A window slides, then grows and shrinks across a string.", ["hashing", "two-pointers"]),
        l("binary-search", "Binary search", "Twenty guesses for a million", "The range halves each step; rotated arrays; searching on the answer.", ["arrays-big-o"]),
      ],
    },
    {
      title: "Recursion",
      lessons: [
        l("recursion", "Recursion", "The function that calls itself", "Call frames pile up and unwind; the Fibonacci call tree repeats itself.", ["how-to-solve"]),
        l("backtracking", "Backtracking", "Try, fail, undo, try again", "Subsets as include-or-skip forks, then N queens undoing dead ends.", ["recursion"]),
      ],
    },
    {
      title: "Lists, stacks and queues",
      lessons: [
        l("linked-lists", "Linked lists", "Turn the chain around", "Reversing re-points every arrow; fast and slow pointers find cycles.", ["arrays-big-o"]),
        l("stacks-queues", "Stacks and queues", "Do the brackets match?", "Last in first out, first in first out, and the monotonic stack.", ["linked-lists"]),
      ],
    },
    {
      title: "Trees",
      lessons: [
        l("binary-trees", "Binary trees", "Four ways to walk a tree", "Four traversal orders light up one tree, and when to use each.", ["recursion", "stacks-queues"]),
        l("binary-search-trees", "Binary search trees", "Left is smaller, right is bigger", "Search and insert turn left or right; sorted keys build a slow tree.", ["binary-search", "binary-trees"]),
        l("heaps", "Heaps and priority queues", "Always serve the smallest first", "Push bubbles up, pop sinks down; top k, merging lists, a running median.", ["linked-lists", "binary-trees"]),
        l("tries", "Tries", "Autocomplete in a few steps", "Words share prefixes along one path; autocomplete lists what's below.", ["strings", "binary-trees"]),
      ],
    },
    {
      title: "Graphs",
      lessons: [
        l("bfs-dfs", "BFS and DFS", "Count the islands", "Rings with a queue, a dive with a stack; grids are graphs too.", ["stacks-queues"]),
        l("topological-sort", "Topological sort", "Which course comes first?", "Courses with no prerequisites left peel off; a cycle never clears.", ["bfs-dfs"]),
        l("dijkstra", "Dijkstra's shortest path", "The quickest way across town", "Distances settle nearest first with a priority queue.", ["heaps", "bfs-dfs"]),
        l("union-find", "Union-find", "Are these two connected?", "Groups merge as edges arrive; an edge inside a group is a cycle.", ["arrays-big-o", "bfs-dfs"]),
      ],
    },
    {
      title: "Optimisation",
      lessons: [
        l("dp-1d", "DP in one dimension", "Remember it, don't redo it", "The call tree collapses once answers are remembered; a row fills left to right.", ["recursion"]),
        l("dp-tables", "DP tables", "Fill the grid, read the answer", "A table fills cell by cell: grid paths, then edit distance.", ["dp-1d"]),
        l("greedy-intervals", "Greedy and intervals", "When the obvious choice is right", "Biggest coin first fails for 1, 3 and 4; sorted intervals merge.", ["heaps", "dp-1d"]),
      ],
    },
    {
      title: "Solving new problems",
      lessons: [
        l("spotting-patterns", "Spotting the pattern", "Which tool does this need?", "Signals in a problem point to a pattern; check the guess on a tiny case.", PATTERNS),
        l("word-ladder", "A hard problem, start to finish", "From hit to cog, a letter at a time", "Word Ladder through all six steps: a hidden graph, BFS and a bug.", ["bfs-dfs", "spotting-patterns"]),
      ],
    },
  ],
};
