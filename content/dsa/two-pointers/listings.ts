import { listings as lesson1 } from "../how-to-solve/listings";

/** Lesson 5's listings, with site markers (LLD §12). The slow run is lesson 1's every pair. */
export const listings = {
  "every-pair": lesson1["every-pair"],
  dedupe: {
    ts: `export function removeDuplicates(nums: number[]): number { // @start
  if (nums.length === 0) return 0; // @empty
  let w = 1;
  for (let r = 1; r < nums.length; r++) {
    if (nums[r] !== nums[w - 1]) { // @skip @changed
      nums[w] = nums[r]; // @keep
      w++;
    }
  }
  return w; // @done
}`,
    py: `def remove_duplicates(nums):  # @start
    if not nums:
        return 0  # @empty
    w = 1
    for r in range(1, len(nums)):
        if nums[r] != nums[w - 1]:  # @skip @changed
            nums[w] = nums[r]  # @keep
            w += 1
    return w  # @done`,
  },
  inward: {
    ts: `export function twoSum(nums: number[], target: number): number[] | null { // @start
  let lo = 0;
  let hi = nums.length - 1;
  while (lo < hi) {
    const sum = nums[lo] + nums[hi]; // @changed
    if (sum === target) { // @check
      return [lo, hi]; // @found
    }
    if (sum < target) { // @changed
      lo++; // @lo
    } else {
      hi--; // @hi
    }
  }
  return null; // @none
}`,
    py: `def two_sum(nums, target):  # @start
    lo, hi = 0, len(nums) - 1
    while lo < hi:
        total = nums[lo] + nums[hi]  # @changed
        if total == target:  # @check
            return [lo, hi]  # @found
        if total < target:  # @changed
            lo += 1  # @lo
        else:
            hi -= 1  # @hi
    return None  # @none`,
  },
};
