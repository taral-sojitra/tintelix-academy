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
];

export const leetcodeUrl = (slug: string) => `https://leetcode.com/problems/${slug}/`;
