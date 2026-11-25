/** Every LeetCode problem the DSA subject links. `evidence` says why it is known to be free: a free LeetCode study plan it appears in. */
export interface LeetCodeProblem {
  slug: string;
  title: string;
  evidence: string;
}

export const LEETCODE: LeetCodeProblem[] = [
  { slug: "two-sum", title: "Two Sum", evidence: "Top Interview 150" },
  { slug: "product-of-array-except-self", title: "Product of Array Except Self", evidence: "LeetCode 75, Top Interview 150" },
  { slug: "best-time-to-buy-and-sell-stock", title: "Best Time to Buy and Sell Stock", evidence: "Top Interview 150" },
  { slug: "spiral-matrix", title: "Spiral Matrix", evidence: "Top Interview 150" },
  { slug: "set-matrix-zeroes", title: "Set Matrix Zeroes", evidence: "Top Interview 150" },
  { slug: "valid-palindrome", title: "Valid Palindrome", evidence: "Top Interview 150" },
  { slug: "valid-anagram", title: "Valid Anagram", evidence: "Top Interview 150" },
  { slug: "reverse-vowels-of-a-string", title: "Reverse Vowels of a String", evidence: "LeetCode 75" },
  { slug: "ransom-note", title: "Ransom Note", evidence: "Top Interview 150" },
  { slug: "group-anagrams", title: "Group Anagrams", evidence: "Top Interview 150, Top 100 Liked" },
  { slug: "longest-consecutive-sequence", title: "Longest Consecutive Sequence", evidence: "Top Interview 150, Top 100 Liked" },
  { slug: "subarray-sum-equals-k", title: "Subarray Sum Equals K", evidence: "Top 100 Liked" },
  { slug: "two-sum-ii-input-array-is-sorted", title: "Two Sum II - Input Array Is Sorted", evidence: "Top Interview 150" },
  { slug: "container-with-most-water", title: "Container With Most Water", evidence: "LeetCode 75, Top Interview 150" },
  { slug: "remove-duplicates-from-sorted-array", title: "Remove Duplicates from Sorted Array", evidence: "Top Interview 150" },
  { slug: "move-zeroes", title: "Move Zeroes", evidence: "LeetCode 75" },
  { slug: "3sum", title: "3Sum", evidence: "Top Interview 150, Top 100 Liked" },
  { slug: "longest-substring-without-repeating-characters", title: "Longest Substring Without Repeating Characters", evidence: "Top Interview 150, Top 100 Liked" },
  { slug: "maximum-number-of-vowels-in-a-substring-of-given-length", title: "Maximum Number of Vowels in a Substring of Given Length", evidence: "LeetCode 75" },
  { slug: "minimum-size-subarray-sum", title: "Minimum Size Subarray Sum", evidence: "Top Interview 150" },
  { slug: "max-consecutive-ones-iii", title: "Max Consecutive Ones III", evidence: "LeetCode 75" },
  { slug: "minimum-window-substring", title: "Minimum Window Substring", evidence: "Top Interview 150, Top 100 Liked" },
  { slug: "search-insert-position", title: "Search Insert Position", evidence: "Top Interview 150, Top 100 Liked" },
  { slug: "search-in-rotated-sorted-array", title: "Search in Rotated Sorted Array", evidence: "Top Interview 150, Top 100 Liked" },
  { slug: "sqrtx", title: "Sqrt(x)", evidence: "Top Interview 150" },
  { slug: "koko-eating-bananas", title: "Koko Eating Bananas", evidence: "LeetCode 75" },
  { slug: "find-minimum-in-rotated-sorted-array", title: "Find Minimum in Rotated Sorted Array", evidence: "Top Interview 150, Top 100 Liked" },
  { slug: "n-th-tribonacci-number", title: "N-th Tribonacci Number", evidence: "LeetCode 75" },
  { slug: "climbing-stairs", title: "Climbing Stairs", evidence: "Top Interview 150, Top 100 Liked" },
  { slug: "powx-n", title: "Pow(x, n)", evidence: "Top Interview 150" },
  { slug: "maximum-depth-of-binary-tree", title: "Maximum Depth of Binary Tree", evidence: "LeetCode 75, Top Interview 150" },
  { slug: "subsets", title: "Subsets", evidence: "Top 100 Liked" },
  { slug: "permutations", title: "Permutations", evidence: "Top Interview 150, Top 100 Liked" },
  { slug: "combination-sum", title: "Combination Sum", evidence: "Top Interview 150, Top 100 Liked" },
  { slug: "n-queens-ii", title: "N-Queens II", evidence: "Top Interview 150" },
  { slug: "letter-combinations-of-a-phone-number", title: "Letter Combinations of a Phone Number", evidence: "LeetCode 75, Top Interview 150" },
  { slug: "reverse-linked-list", title: "Reverse Linked List", evidence: "LeetCode 75, Top 100 Liked" },
  { slug: "linked-list-cycle", title: "Linked List Cycle", evidence: "Top Interview 150, Top 100 Liked" },
  { slug: "delete-the-middle-node-of-a-linked-list", title: "Delete the Middle Node of a Linked List", evidence: "LeetCode 75" },
  { slug: "merge-two-sorted-lists", title: "Merge Two Sorted Lists", evidence: "Top Interview 150, Top 100 Liked" },
  { slug: "odd-even-linked-list", title: "Odd Even Linked List", evidence: "LeetCode 75" },
];

export const leetcodeUrl = (slug: string) => `https://leetcode.com/problems/${slug}/`;
