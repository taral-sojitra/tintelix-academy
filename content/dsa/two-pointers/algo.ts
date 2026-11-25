import type { Tracer } from "@tintelix/dsa";

export { everyPair } from "../how-to-solve/algo";

type In = { nums: number[]; target: number };

/** Two Sum on sorted numbers: one pointer at each end; too small moves lo right, too big moves hi left. */
export function inward(t: Tracer, { nums, target }: In) {
  const a = t.array("nums", nums);
  const lo = t.pointer("lo", a, 0);
  const hi = t.pointer("hi", a, nums.length - 1);
  t.set("target", target);
  t.set("sum", null);
  const sorted = nums.every((x, i) => i === 0 || nums[i - 1]! <= x);
  t.at("start", !nums.length ? "No numbers at all" : sorted ? `Sorted numbers; find two that add up to ${target}` : "These numbers aren't sorted, so the inward rule can miss a pair");
  while (lo.at < hi.at) {
    t.count();
    const x = nums[lo.at]!;
    const y = nums[hi.at]!;
    t.set("sum", x + y);
    a.clearMarks();
    a.mark(lo.at, "compare");
    a.mark(hi.at, "compare");
    if (x + y === target) {
      t.at("check", `${x} + ${y} = ${target}: that's the target`);
      a.mark(lo.at, "found");
      a.mark(hi.at, "found");
      t.at("found", `Positions ${lo.at} and ${hi.at} add up to ${target}`);
      return t.result([lo.at, hi.at]);
    }
    if (x + y < target) {
      t.at("check", `${x} + ${y} = ${x + y}: too small`);
      lo.move(1);
      t.at("lo", `Only a bigger left number can help: lo moves right`);
    } else {
      t.at("check", `${x} + ${y} = ${x + y}: too big`);
      hi.move(-1);
      t.at("hi", `${y} is too big even with the smallest number left: hi moves left`);
    }
  }
  a.clearMarks();
  t.at("none", nums.length ? `lo met hi: no two numbers add up to ${target}` : `No two numbers add up to ${target}`);
  t.result(null);
}

/** Remove Duplicates from Sorted Array: r reads every number, w marks where the next new one is written. */
export function dedupe(t: Tracer, { nums }: In) {
  const a = t.array("nums", nums);
  if (!nums.length) {
    t.at("empty", "No numbers: nothing to keep");
    return t.result(0);
  }
  const w = t.pointer("w", a, 1);
  const r = t.pointer("r", a, 1);
  a.mark(0, "done");
  t.at("start", "The first number is always kept; w is where the next new number goes");
  for (; r.at < nums.length; r.move(1)) {
    t.count();
    const x = a.get(r.at) as number;
    const last = a.get(w.at - 1) as number;
    a.clearMarks();
    for (let i = 0; i < w.at; i++) a.mark(i, "done");
    a.mark(r.at, "active");
    if (x !== last) {
      a.put(w.at, x);
      a.mark(w.at, "done");
      t.at("keep", `${x} is new: write it at ${w.at}`);
      w.move(1);
    } else t.at("skip", `${x} matches the last kept number: skip it`);
  }
  a.clearMarks();
  for (let i = 0; i < w.at; i++) a.mark(i, "done");
  t.at("done", `${w.at} different number${w.at === 1 ? "" : "s"} kept at the front`);
  t.result(w.at);
}
