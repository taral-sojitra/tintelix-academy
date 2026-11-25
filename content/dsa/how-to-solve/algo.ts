import type { Tracer } from "@tintelix/dsa";

/** Two Sum by brute force: every pair, left to right. */
export function everyPair(t: Tracer, { nums, target }: { nums: number[]; target: number }) {
  const a = t.array("nums", nums);
  const i = t.pointer("i", a, 0);
  const j = t.pointer("j", a, 1);
  t.set("target", target);
  t.set("sum", null);
  t.at("start", nums.length ? `${nums.length} numbers; find two that add up to ${target}` : "No numbers at all");
  for (i.to(0); i.at < nums.length; i.move(1)) {
    for (j.to(i.at + 1); j.at < nums.length; j.move(1)) {
      const x = nums[i.at]!;
      const y = nums[j.at]!;
      t.count();
      t.set("sum", x + y);
      a.clearMarks();
      a.mark(i.at, "compare");
      a.mark(j.at, "compare");
      if (x + y === target) {
        t.at("check", `${x} + ${y} = ${x + y}: that's the target`);
        a.mark(i.at, "found");
        a.mark(j.at, "found");
        t.at("found", `Positions ${i.at} and ${j.at} add up to ${target}`);
        return t.result([i.at, j.at]);
      }
      t.at("check", `${x} + ${y} = ${x + y}, not ${target}`);
    }
  }
  a.clearMarks();
  t.at("none", `Every pair checked: no two numbers add up to ${target}`);
  t.result(null);
}
