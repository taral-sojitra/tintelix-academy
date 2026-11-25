/** Lesson 2's listings, with site markers (LLD §12). */
export const listings = {
  read: {
    ts: `export function readLast(nums: number[]): number { // @start
  return nums[nums.length - 1]; // @read
}`,
    py: `def read_last(nums):  # @start
    return nums[-1]  # @read`,
  },
  insert: {
    ts: `export function insertFront(nums: number[]): number[] { // @start
  nums.push(0);
  for (let i = nums.length - 1; i > 0; i--) {
    nums[i] = nums[i - 1]; // @shift
  }
  nums[0] = 0; // @place
  return nums; // @done
}`,
    py: `def insert_front(nums):  # @start
    nums.append(0)
    for i in range(len(nums) - 1, 0, -1):
        nums[i] = nums[i - 1]  # @shift
    nums[0] = 0  # @place
    return nums  # @done`,
  },
  grid: {
    ts: `export function toGrid(nums: number[], k: number): number[][] { // @start
  const grid: number[][] = [];
  for (let i = 0; i < nums.length; i++) {
    if (i % k === 0) grid.push([]);
    grid[Math.floor(i / k)].push(nums[i]); // @cell
  }
  return grid; // @done
}`,
    py: `def to_grid(nums, k):  # @start
    grid = []
    for i in range(len(nums)):
        if i % k == 0:
            grid.append([])
        grid[i // k].append(nums[i])  # @cell
    return grid  # @done`,
  },
  windows: {
    ts: `export function windowSums(nums: number[], k: number): number[] { // @start
  const sums: number[] = [];
  for (let i = 0; i + k <= nums.length; i++) {
    let sum = 0;
    for (let j = i; j < i + k; j++) {
      sum += nums[j]; // @add
    }
    sums.push(sum); // @window
  }
  return sums; // @done
}`,
    py: `def window_sums(nums, k):  # @start
    sums = []
    for i in range(len(nums) - k + 1):
        total = 0
        for j in range(i, i + k):
            total += nums[j]  # @add
        sums.append(total)  # @window
    return sums  # @done`,
  },
  prefix: {
    ts: `export function windowSumsPrefix(nums: number[], k: number): number[] { // @start
  const prefix = [0];
  for (let i = 0; i < nums.length; i++) {
    prefix.push(prefix[i] + nums[i]); // @build @changed
  }
  const sums: number[] = [];
  for (let i = 0; i + k <= nums.length; i++) {
    sums.push(prefix[i + k] - prefix[i]); // @window @changed
  }
  return sums; // @done
}`,
    py: `def window_sums_prefix(nums, k):  # @start
    prefix = [0]
    for i in range(len(nums)):
        prefix.append(prefix[i] + nums[i])  # @build @changed
    sums = []
    for i in range(len(nums) - k + 1):
        sums.append(prefix[i + k] - prefix[i])  # @window @changed
    return sums  # @done`,
  },
};
