import type { TList, Tracer } from "@tintelix/dsa";

type In = { nums: number[]; pos: number };
const id = (i: number) => `n${i}`;
/** Builds the list from the numbers; with `loop`, the tail links back to node `pos`. */
function build(t: Tracer, { nums, pos }: In, loop: boolean): TList {
  const l = t.list("list");
  nums.forEach((x, i) => l.add(id(i), x));
  nums.forEach((_, i) => l.link(id(i), i + 1 < nums.length ? id(i + 1) : null));
  if (loop && pos >= 0 && pos < nums.length) l.link(id(nums.length - 1), id(pos));
  l.head(nums.length ? id(0) : null);
  return l;
}
const hasLoop = ({ nums, pos }: In) => pos >= 0 && pos < nums.length;

/** Reverse the slow way: copy the values into an array, then write them back from the end. */
export function copyReverse(t: Tracer, input: In) {
  const { nums } = input;
  const l = build(t, input, false);
  const copy = t.array("values", Array(nums.length).fill(null));
  t.at("start", nums.length ? "Copy every value out, then write them back reversed" : "An empty list is its own reverse");
  for (let i = 0; i < nums.length; i++) {
    t.count();
    copy.put(i, nums[i]!);
    l.tag("curr", id(i));
    t.at("copy", `Copy ${nums[i]}`);
  }
  for (let i = 0; i < nums.length; i++) {
    t.count();
    const v = nums[nums.length - 1 - i]!;
    l.put(id(i), v);
    l.mark(id(i), "done");
    copy.mark(nums.length - 1 - i, "dim");
    l.tag("curr", id(i));
    t.at("write", `Write ${v} back`);
  }
  l.tag("curr", null);
  t.at("done", "Reversed, using an extra array as long as the list");
  t.result([...nums].reverse());
}

/** Reverse in place: walk once, pointing each node's arrow back at the node before it. */
export function reverseInPlace(t: Tracer, input: In) {
  const { nums } = input;
  const l = build(t, input, false);
  let prev: number | null = null;
  let curr: number | null = nums.length ? 0 : null;
  l.tag("curr", curr === null ? null : id(curr));
  t.set("prev", "null");
  t.at("start", nums.length ? "prev starts as null; curr starts at the head" : "An empty list is its own reverse");
  while (curr !== null) {
    t.count();
    const next: number | null = curr + 1 < nums.length ? curr + 1 : null;
    l.tag("next", next === null ? null : id(next));
    t.at("save", `Save curr's next (${next === null ? "null" : nums[next]}) before the arrow moves`);
    l.link(id(curr), prev === null ? null : id(prev));
    l.mark(id(curr), "done");
    t.at("flip", `${nums[curr]} now points back to ${prev === null ? "null" : nums[prev]}`);
    prev = curr;
    curr = next;
    l.tag("prev", id(prev));
    l.tag("curr", curr === null ? null : id(curr));
    l.tag("next", null);
    t.set("prev", nums[prev]!);
    t.at("step", curr === null ? "curr ran off the end: prev is the new head" : `prev and curr step on: curr is ${nums[curr]}`);
  }
  l.head(prev === null ? null : id(prev));
  l.tag("prev", null);
  t.at("done", nums.length ? `Every arrow flipped: the list starts at ${nums[prev!]}` : "Nothing to flip");
  t.result([...nums].reverse());
}

/** Loop check the slow way: remember every node visited; meeting one again means a loop. */
export function seenSet(t: Tracer, input: In) {
  const { nums, pos } = input;
  const l = build(t, input, true);
  const seen = t.map("seen");
  t.at("start", "Walk the list, remembering every node");
  let i: number | null = nums.length ? 0 : null;
  while (i !== null) {
    t.count();
    l.tag("curr", id(i));
    if (seen.has(`#${i}`)) {
      l.mark(id(i), "bad");
      seen.mark(`#${i}`, "found");
      t.at("again", `Node ${nums[i]} was visited before: there's a loop`);
      return t.result(true);
    }
    seen.put(`#${i}`, nums[i]!);
    l.mark(id(i), "visited");
    t.at("visit", `Visit ${nums[i]} and remember it`);
    i = i + 1 < nums.length ? i + 1 : hasLoop(input) ? pos : null;
  }
  l.tag("curr", null);
  t.at("end", "Reached the end: no loop");
  t.result(false);
}

/** Floyd's fast and slow pointers: slow moves one node, fast two; in a loop, fast catches slow. */
export function fastSlow(t: Tracer, input: In) {
  const { nums, pos } = input;
  const l = build(t, input, true);
  const next = (i: number | null) => (i === null ? null : i + 1 < nums.length ? i + 1 : hasLoop(input) ? pos : null);
  let slow: number | null = nums.length ? 0 : null;
  let fast: number | null = slow;
  const tags = () => {
    l.tag("slow", slow === null ? null : id(slow));
    l.tag("fast", fast === null ? null : id(fast));
  };
  tags();
  t.at("start", "slow and fast both start at the head");
  while (fast !== null && next(fast) !== null) {
    t.count();
    slow = next(slow);
    fast = next(next(fast));
    tags();
    t.at("move", `slow moves 1 to ${nums[slow!]}, fast moves 2 to ${fast === null ? "the end" : nums[fast]}`);
    if (slow === fast) {
      l.mark(id(slow!), "found");
      t.at("meet", `They meet at ${nums[slow!]}: there's a loop`);
      return t.result(true);
    }
  }
  t.at("end", "fast reached the end: no loop");
  t.result(false);
}
