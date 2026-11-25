import type { Tracer } from "@tintelix/dsa";

export { everyPair } from "../how-to-solve/algo";

type In = { nums: number[]; target: number };
const M = 7;
const bucketOf = (x: number) => ((x % M) + M) % M;
const times = (n: number) => (n === 1 ? "once" : `${n} times`);

/** A hash set by hand: each key lands in bucket key mod 7, and a lookup checks only its own bucket. */
export function buckets(t: Tracer, { nums, target }: In) {
  const a = t.array("nums", nums);
  const b = t.map("buckets");
  const chains: number[][] = Array.from({ length: M }, () => []);
  for (let k = 0; k < M; k++) b.put(String(k), null);
  t.at("start", `${M} empty buckets: key mod ${M} picks a key's bucket`);
  for (let i = 0; i < nums.length; i++) {
    t.count();
    const x = nums[i]!;
    const k = bucketOf(x);
    chains[k]!.push(x);
    b.put(String(k), chains[k]!.join(", "));
    a.clearMarks();
    b.clearMarks();
    a.mark(i, "active");
    b.mark(String(k), "active");
    t.at("put", `${x} mod ${M} = ${k}: bucket ${k}`);
  }
  a.clearMarks();
  b.clearMarks();
  const k = bucketOf(target);
  b.mark(String(k), "compare");
  t.at("find", `Is ${target} here? ${target} mod ${M} = ${k}, so only bucket ${k} can hold it`);
  for (const x of chains[k]!) {
    t.count();
    if (x === target) {
      t.at("check", `${x} = ${target}`);
      b.mark(String(k), "found");
      t.at("found", `Found ${target}, checking only bucket ${k}`);
      return t.result(true);
    }
    t.at("check", `${x} ≠ ${target}`);
  }
  b.mark(String(k), "bad");
  t.at("none", chains[k]!.length ? `Bucket ${k} doesn't hold ${target}: it isn't in the set` : `Bucket ${k} is empty: ${target} isn't in the set`);
  t.result(false);
}

/** Two Sum in one pass: for each number, ask the map for its partner, then remember the number. */
export function seenMap(t: Tracer, { nums, target }: In) {
  const a = t.array("nums", nums);
  const seen = t.map("seen");
  const i = t.pointer("i", a, 0);
  t.set("target", target);
  t.set("need", null);
  t.at("start", nums.length ? `${nums.length} numbers; find two that add up to ${target}` : "No numbers at all");
  for (; i.at < nums.length; i.move(1)) {
    t.count();
    const x = nums[i.at]!;
    const need = target - x;
    t.set("need", need);
    a.clearMarks();
    seen.clearMarks();
    a.mark(i.at, "active");
    if (seen.has(String(need))) {
      const j = seen.get(String(need)) as number;
      seen.mark(String(need), "found");
      a.mark(j, "found");
      a.mark(i.at, "found");
      t.at("look", `Need ${target} − ${x} = ${need}: seen at position ${j}`);
      t.at("found", `Positions ${j} and ${i.at} add up to ${target}`);
      return t.result([j, i.at]);
    }
    t.at("look", `Need ${target} − ${x} = ${need}: not seen yet`);
    seen.put(String(x), i.at);
    seen.mark(String(x), "active");
    t.at("store", `Remember ${x} at position ${i.at}`);
  }
  a.clearMarks();
  seen.clearMarks();
  t.at("none", `No partner was ever seen: no two numbers add up to ${target}`);
  t.result(null);
}

/** Subarray Sum Equals K: a run ends here exactly when (running sum − k) was a running sum before. */
export function runningSum(t: Tracer, { nums, target: k }: In) {
  const a = t.array("nums", nums);
  const sums = t.map("sums");
  sums.put("0", 1);
  let sum = 0;
  let found = 0;
  t.set("k", k);
  t.set("sum", 0);
  t.set("count", 0);
  t.at("start", `Count runs that add up to ${k}. A running sum of 0 is seen once, before anything`);
  for (let i = 0; i < nums.length; i++) {
    t.count();
    sum += nums[i]!;
    t.set("sum", sum);
    a.clearMarks();
    sums.clearMarks();
    a.mark(i, "active");
    t.at("add", `Running sum: ${sum}`);
    const before = (sums.get(String(sum - k)) as number | null) ?? 0;
    if (before) {
      found += before;
      t.set("count", found);
      sums.mark(String(sum - k), "found");
      t.at("match", `${sum} − ${k} = ${sum - k}, seen ${times(before)}: ${before} run${before === 1 ? "" : "s"} end${before === 1 ? "s" : ""} here`);
    } else t.at("match", `${sum} − ${k} = ${sum - k}, never seen: no run ends here`);
    const n = ((sums.get(String(sum)) as number | null) ?? 0) + 1;
    sums.put(String(sum), n);
    sums.mark(String(sum), "active");
    t.at("store", `Running sum ${sum} now seen ${times(n)}`);
  }
  a.clearMarks();
  sums.clearMarks();
  t.at("done", `${found} run${found === 1 ? "" : "s"} add${found === 1 ? "s" : ""} up to ${k}`);
  t.result(found);
}
