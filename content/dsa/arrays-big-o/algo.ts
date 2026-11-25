import type { Tracer } from "@tintelix/dsa";

type In = { nums: number[]; k: number };

/** Reading a cell by its index: one step, however long the array. */
export function readLast(t: Tracer, { nums }: In) {
  const a = t.array("nums", nums);
  t.at("start", `${nums.length} numbers in a row of numbered cells`);
  const i = nums.length - 1;
  t.count();
  a.mark(i, "found");
  t.set(`nums[${i}]`, nums[i]!);
  t.at("read", `Cell ${i} holds ${nums[i]}: one step to jump straight to it`);
  t.result(nums[i]);
}

/** Inserting at the front: every item moves one cell right first. */
export function insertFront(t: Tracer, { nums }: In) {
  const a = t.array("nums", [...nums, null]);
  t.at("start", `Make room for a 0 at the front of ${nums.length} numbers`);
  for (let i = nums.length; i > 0; i--) {
    t.count();
    a.put(i, a.get(i - 1));
    a.clearMarks();
    a.mark(i, "active");
    t.at("shift", `Move ${a.get(i)} from cell ${i - 1} to cell ${i}`);
  }
  t.count();
  a.put(0, 0);
  a.clearMarks();
  a.mark(0, "found");
  t.at("place", "Cell 0 is free: put the 0 there");
  t.at("done", `${nums.length} moves to insert one number`);
  t.result([0, ...nums]);
}

/** A grid stored row after row: index i sits at row i ÷ k, column i mod k. */
export function toGrid(t: Tracer, { nums, k }: In) {
  const a = t.array("nums", nums);
  const g = t.grid("grid", Math.ceil(nums.length / k), k);
  t.at("start", `${nums.length} numbers as rows of ${k}`);
  for (let i = 0; i < nums.length; i++) {
    const r = Math.floor(i / k);
    const c = i % k;
    t.count();
    g.put(r, c, nums[i]!);
    a.clearMarks();
    g.clearMarks();
    a.mark(i, "active");
    g.mark(r, c, "active");
    t.at("cell", `Index ${i} is row ${i} ÷ ${k} = ${r}, column ${i} mod ${k} = ${c}`);
  }
  a.clearMarks();
  g.clearMarks();
  t.at("done", `${Math.ceil(nums.length / k)} rows of ${k}`);
  const rows: number[][] = [];
  nums.forEach((x, i) => (i % k ? rows[rows.length - 1]!.push(x) : rows.push([x])));
  t.result(rows);
}

/** The sum of every window of k numbers, adding each window up from scratch. */
export function windowSums(t: Tracer, { nums, k }: In) {
  const count = Math.max(0, nums.length - k + 1);
  const a = t.array("nums", nums);
  const sums = t.array("sums", Array(count).fill(null));
  t.set("sum", null);
  t.at("start", `Sum every window of ${k}: ${count} windows`);
  const out: number[] = [];
  for (let i = 0; i + k <= nums.length; i++) {
    let sum = 0;
    for (let j = i; j < i + k; j++) {
      t.count();
      sum += nums[j]!;
      t.set("sum", sum);
      a.clearMarks();
      for (let x = i; x < i + k; x++) a.mark(x, x === j ? "active" : x < j ? "compare" : null);
      t.at("add", `Add ${nums[j]}: ${sum}`);
    }
    out.push(sum);
    sums.put(i, sum);
    sums.clearMarks();
    sums.mark(i, "found");
    t.at("window", `Window ${i} to ${i + k - 1} sums to ${sum}`);
  }
  a.clearMarks();
  t.at("done", `${count} windows, each added up from scratch`);
  t.result(out);
}

/** The same windows from prefix sums: build them once, then each window is one subtraction. */
export function windowSumsPrefix(t: Tracer, { nums, k }: In) {
  const count = Math.max(0, nums.length - k + 1);
  const a = t.array("nums", nums);
  const prefix = t.array("prefix", [0, ...Array(nums.length).fill(null)]);
  const sums = t.array("sums", Array(count).fill(null));
  const p = [0];
  t.set("sum", null);
  t.at("start", "prefix[i] will hold the sum of the first i numbers");
  for (let i = 0; i < nums.length; i++) {
    t.count();
    p.push(p[i]! + nums[i]!);
    prefix.put(i + 1, p[i + 1]!);
    a.clearMarks();
    prefix.clearMarks();
    a.mark(i, "active");
    prefix.mark(i + 1, "active");
    t.at("build", `prefix[${i + 1}] = ${p[i]} + ${nums[i]} = ${p[i + 1]}`);
  }
  a.clearMarks();
  const out: number[] = [];
  for (let i = 0; i + k <= nums.length; i++) {
    t.count();
    const sum = p[i + k]! - p[i]!;
    out.push(sum);
    t.set("sum", sum);
    sums.put(i, sum);
    prefix.clearMarks();
    sums.clearMarks();
    prefix.mark(i + k, "compare");
    prefix.mark(i, "compare");
    sums.mark(i, "found");
    t.at("window", `Window ${i} to ${i + k - 1}: prefix[${i + k}] − prefix[${i}] = ${p[i + k]} − ${p[i]} = ${sum}`);
  }
  prefix.clearMarks();
  sums.clearMarks();
  t.at("done", `${nums.length} additions to build, then one subtraction per window`);
  t.result(out);
}
