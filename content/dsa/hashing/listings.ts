import { listings as lesson1 } from "../how-to-solve/listings";

/** Lesson 4's listings, with site markers (LLD §12). The slow run is lesson 1's every pair. */
export const listings = {
  "every-pair": lesson1["every-pair"],
  buckets: {
    ts: `export function contains(nums: number[], key: number): boolean { // @start
  const m = 7;
  const buckets: number[][] = Array.from({ length: m }, () => []);
  for (const x of nums) {
    buckets[((x % m) + m) % m].push(x); // @put
  }
  const bucket = buckets[((key % m) + m) % m]; // @find
  for (const x of bucket) {
    if (x === key) { // @check
      return true; // @found
    }
  }
  return false; // @none
}`,
    py: `def contains(nums, key):  # @start
    m = 7
    buckets = [[] for _ in range(m)]
    for x in nums:
        buckets[x % m].append(x)  # @put
    bucket = buckets[key % m]  # @find
    for x in bucket:
        if x == key:  # @check
            return True  # @found
    return False  # @none`,
  },
  running: {
    ts: `export function subarraySum(nums: number[], k: number): number { // @start
  const seen = new Map<number, number>([[0, 1]]);
  let sum = 0;
  let count = 0;
  for (const x of nums) {
    sum += x; // @add
    count += seen.get(sum - k) ?? 0; // @match @changed
    seen.set(sum, (seen.get(sum) ?? 0) + 1); // @store
  }
  return count; // @done
}`,
    py: `def subarray_sum(nums, k):  # @start
    seen = {0: 1}
    total = 0
    count = 0
    for x in nums:
        total += x  # @add
        count += seen.get(total - k, 0)  # @match @changed
        seen[total] = seen.get(total, 0) + 1  # @store
    return count  # @done`,
  },
  "one-pass": {
    ts: `export function twoSum(nums: number[], target: number): number[] | null { // @start
  const seen = new Map<number, number>();
  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i]; // @changed
    if (seen.has(need)) { // @look
      return [seen.get(need)!, i]; // @found
    }
    seen.set(nums[i], i); // @store
  }
  return null; // @none
}`,
    py: `def two_sum(nums, target):  # @start
    seen = {}
    for i, x in enumerate(nums):
        need = target - x  # @changed
        if need in seen:  # @look
            return [seen[need], i]  # @found
        seen[x] = i  # @store
    return None  # @none`,
  },
};
