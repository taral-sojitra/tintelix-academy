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
];

export const leetcodeUrl = (slug: string) => `https://leetcode.com/problems/${slug}/`;
