/** Every LeetCode problem the DSA subject links. `evidence` says why it is known to be free: a free LeetCode study plan it appears in. */
export interface LeetCodeProblem {
  slug: string;
  title: string;
  evidence: string;
}

export const LEETCODE: LeetCodeProblem[] = [{ slug: "two-sum", title: "Two Sum", evidence: "Top Interview 150" }];

export const leetcodeUrl = (slug: string) => `https://leetcode.com/problems/${slug}/`;
