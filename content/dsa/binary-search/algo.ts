import type { TArray, TPointer, Tracer } from "@tintelix/dsa";

type In = { nums: number[]; target: number };
const isSorted = (nums: number[]) => nums.every((x, i) => i === 0 || nums[i - 1]! <= x);
/** Sorted, then turned at one point: at most one drop, and the end no bigger than the start. */
const isRotated = (nums: number[]) => {
  const drops = nums.filter((x, i) => i > 0 && nums[i - 1]! > x).length;
  return drops === 0 || (drops === 1 && nums.at(-1)! <= nums[0]!);
};
/** Dims every cell outside lo..hi and rings mid. */
function paint(a: TArray, n: number, lo: TPointer, hi: TPointer, mid?: TPointer) {
  a.clearMarks();
  for (let i = 0; i < n; i++) if (i < lo.at || i > hi.at) a.mark(i, "dim");
  if (mid && mid.at >= lo.at && mid.at <= hi.at) a.mark(mid.at, "compare");
}

/** Look at every number from the left until the target turns up. */
export function linear(t: Tracer, { nums, target }: In) {
  const a = t.array("nums", nums);
  const i = t.pointer("i", a, 0);
  t.set("target", target);
  t.at("start", nums.length ? `Look for ${target}, one number at a time` : "No numbers at all");
  for (; i.at < nums.length; i.move(1)) {
    t.count();
    a.clearMarks();
    a.mark(i.at, "compare");
    if (nums[i.at] === target) {
      t.at("look", `${nums[i.at]} is ${target}`);
      a.mark(i.at, "found");
      t.at("found", `Found ${target} at position ${i.at}`);
      return t.result(i.at);
    }
    t.at("look", `${nums[i.at]} isn't ${target}`);
  }
  a.clearMarks();
  t.at("none", `${target} isn't here`);
  t.result(-1);
}

/** Binary search: probe the middle of lo..hi and throw away the half that can't hold the target. */
export function binary(t: Tracer, { nums, target }: In) {
  const a = t.array("nums", nums);
  const lo = t.pointer("lo", a, 0);
  const hi = t.pointer("hi", a, nums.length - 1);
  const mid = t.pointer("mid", a, -1);
  t.set("target", target);
  t.at("start", !nums.length ? "No numbers at all" : isSorted(nums) ? `Look for ${target} in ${nums.length} sorted numbers` : "These numbers aren't sorted, so halving can throw the target away");
  while (lo.at <= hi.at) {
    t.count();
    mid.to(Math.floor((lo.at + hi.at) / 2));
    const x = nums[mid.at]!;
    paint(a, nums.length, lo, hi, mid);
    if (x === target) {
      t.at("probe", `The middle is ${x}: that's ${target}`);
      a.mark(mid.at, "found");
      t.at("found", `Found ${target} at position ${mid.at}`);
      return t.result(mid.at);
    }
    if (x < target) {
      t.at("probe", `The middle is ${x}, smaller than ${target}`);
      lo.to(mid.at + 1);
      paint(a, nums.length, lo, hi);
      t.at("lo", `${target} can only be right of ${x}: lo moves past it`);
    } else {
      t.at("probe", `The middle is ${x}, bigger than ${target}`);
      hi.to(mid.at - 1);
      paint(a, nums.length, lo, hi);
      t.at("hi", `${target} can only be left of ${x}: hi moves before it`);
    }
    mid.to(-1);
  }
  t.at("none", `The range is empty: ${target} isn't here`);
  t.result(-1);
}

/** Search in Rotated Sorted Array: one half around mid is always sorted; check whether the target fits in it. */
export function rotated(t: Tracer, { nums, target }: In) {
  const a = t.array("nums", nums);
  const lo = t.pointer("lo", a, 0);
  const hi = t.pointer("hi", a, nums.length - 1);
  const mid = t.pointer("mid", a, -1);
  t.set("target", target);
  t.at("start", !nums.length ? "No numbers at all" : isRotated(nums) ? `Sorted, then turned: look for ${target}` : "These numbers aren't a sorted list turned at one point, so this can miss");
  while (lo.at <= hi.at) {
    t.count();
    const md = Math.floor((lo.at + hi.at) / 2);
    mid.to(md);
    const [l, m, h] = [nums[lo.at]!, nums[md]!, nums[hi.at]!];
    paint(a, nums.length, lo, hi, mid);
    if (m === target) {
      t.at("probe", `The middle is ${m}: that's ${target}`);
      a.mark(md, "found");
      t.at("found", `Found ${target} at position ${md}`);
      return t.result(md);
    }
    t.at("probe", `The middle is ${m}, not ${target}`);
    if (l <= m) {
      if (l <= target && target < m) {
        hi.to(md - 1);
        paint(a, nums.length, lo, hi);
        t.at("in-left", `${l} to ${m} is sorted and holds ${target}: keep the left half`);
      } else {
        lo.to(md + 1);
        paint(a, nums.length, lo, hi);
        t.at("not-left", `${l} to ${m} is sorted but can't hold ${target}: keep the right half`);
      }
    } else if (m < target && target <= h) {
      lo.to(md + 1);
      paint(a, nums.length, lo, hi);
      t.at("in-right", `${m} to ${h} is sorted and holds ${target}: keep the right half`);
    } else {
      hi.to(md - 1);
      paint(a, nums.length, lo, hi);
      t.at("not-right", `${m} to ${h} is sorted but can't hold ${target}: keep the left half`);
    }
    mid.to(-1);
  }
  t.at("none", `The range is empty: ${target} isn't here`);
  t.result(-1);
}

/** Search on the answer: the largest whole number whose square is at most x. */
export function sqrt(t: Tracer, { target: x }: In) {
  let lo = 0;
  let hi = x;
  let ans = 0;
  t.set("x", x);
  t.set("lo", lo);
  t.set("hi", hi);
  t.set("mid", null);
  t.set("mid × mid", null);
  t.set("answer", 0);
  t.at("start", `The answer is somewhere from 0 to ${x}: guess the middle`);
  while (lo <= hi) {
    t.count();
    const mid = Math.floor((lo + hi) / 2);
    t.set("mid", mid);
    t.set("mid × mid", mid * mid);
    if (mid * mid <= x) {
      ans = mid;
      lo = mid + 1;
      t.set("answer", ans);
      t.set("lo", lo);
      t.at("fits", `${mid} × ${mid} = ${mid * mid} fits: ${mid} works, try bigger`);
    } else {
      hi = mid - 1;
      t.set("hi", hi);
      t.at("over", `${mid} × ${mid} = ${mid * mid} is too big: try smaller`);
    }
  }
  t.at("done", `${ans} is the biggest whole number with a square no bigger than ${x}`);
  t.result(ans);
}
