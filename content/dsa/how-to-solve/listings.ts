/** The code a learner would write, with site markers (LLD §12): every pair, in TypeScript and Python. */
export const listings = {
  "every-pair": {
    ts: `export function twoSum(nums: number[], target: number): number[] | null { // @start
  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {
      if (nums[i] + nums[j] === target) { // @check
        return [i, j]; // @found
      }
    }
  }
  return null; // @none
}`,
    py: `def two_sum(nums, target):  # @start
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[i] + nums[j] == target:  # @check
                return [i, j]  # @found
    return None  # @none`,
  },
};
