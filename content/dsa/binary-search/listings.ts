/** Lesson 7's listings, with site markers (LLD §12). */
export const listings = {
  linear: {
    ts: `export function search(nums: number[], target: number): number { // @start
  for (let i = 0; i < nums.length; i++) {
    if (nums[i] === target) { // @look
      return i; // @found
    }
  }
  return -1; // @none
}`,
    py: `def search(nums, target):  # @start
    for i in range(len(nums)):
        if nums[i] == target:  # @look
            return i  # @found
    return -1  # @none`,
  },
  rotated: {
    ts: `export function search(nums: number[], target: number): number { // @start
  let lo = 0;
  let hi = nums.length - 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (nums[mid] === target) { // @probe
      return mid; // @found
    }
    if (nums[lo] <= nums[mid]) { // @changed
      // The left half is sorted.
      if (nums[lo] <= target && target < nums[mid]) {
        hi = mid - 1; // @in-left
      } else {
        lo = mid + 1; // @not-left
      }
    } else {
      // The right half is sorted.
      if (nums[mid] < target && target <= nums[hi]) {
        lo = mid + 1; // @in-right
      } else {
        hi = mid - 1; // @not-right
      }
    }
  }
  return -1; // @none
}`,
    py: `def search(nums, target):  # @start
    lo, hi = 0, len(nums) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if nums[mid] == target:  # @probe
            return mid  # @found
        if nums[lo] <= nums[mid]:  # @changed
            # The left half is sorted.
            if nums[lo] <= target < nums[mid]:
                hi = mid - 1  # @in-left
            else:
                lo = mid + 1  # @not-left
        else:
            # The right half is sorted.
            if nums[mid] < target <= nums[hi]:
                lo = mid + 1  # @in-right
            else:
                hi = mid - 1  # @not-right
    return -1  # @none`,
  },
  sqrt: {
    ts: `export function mySqrt(x: number): number { // @start
  let lo = 0;
  let hi = x;
  let answer = 0;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (mid * mid <= x) { // @changed
      answer = mid; // @fits
      lo = mid + 1;
    } else {
      hi = mid - 1; // @over
    }
  }
  return answer; // @done
}`,
    py: `def my_sqrt(x):  # @start
    lo, hi = 0, x
    answer = 0
    while lo <= hi:
        mid = (lo + hi) // 2
        if mid * mid <= x:  # @changed
            answer = mid  # @fits
            lo = mid + 1
        else:
            hi = mid - 1  # @over
    return answer  # @done`,
  },
  binary: {
    ts: `export function search(nums: number[], target: number): number { // @start
  let lo = 0;
  let hi = nums.length - 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (nums[mid] === target) { // @probe
      return mid; // @found
    }
    if (nums[mid] < target) { // @changed
      lo = mid + 1; // @lo
    } else {
      hi = mid - 1; // @hi
    }
  }
  return -1; // @none
}`,
    py: `def search(nums, target):  # @start
    lo, hi = 0, len(nums) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if nums[mid] == target:  # @probe
            return mid  # @found
        if nums[mid] < target:  # @changed
            lo = mid + 1  # @lo
        else:
            hi = mid - 1  # @hi
    return -1  # @none`,
  },
};
