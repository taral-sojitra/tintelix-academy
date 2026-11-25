import type { Tracer } from "@tintelix/dsa";

type In = { s: string; t: string };

/** Palindrome check by copying the string backwards, then comparing position by position. */
export function reverseCompare(t: Tracer, { s }: In) {
  const n = s.length;
  const a = t.array("s", [...s]);
  const r = t.array("reversed", Array(n).fill(null));
  t.at("start", n ? `Is "${s}" the same backwards?` : "An empty string reads the same both ways");
  for (let i = 0; i < n; i++) {
    t.count();
    r.put(i, s[n - 1 - i]!);
    a.clearMarks();
    r.clearMarks();
    a.mark(n - 1 - i, "active");
    r.mark(i, "active");
    t.at("copy", `reversed[${i}] = s[${n - 1 - i}] = ${s[n - 1 - i]}`);
  }
  a.clearMarks();
  r.clearMarks();
  for (let i = 0; i < n; i++) {
    t.count();
    const x = s[i]!;
    const y = s[n - 1 - i]!;
    a.mark(i, "compare");
    r.mark(i, "compare");
    if (x !== y) {
      t.at("compare", `${x} ≠ ${y} at position ${i}`);
      a.mark(i, "bad");
      r.mark(i, "bad");
      t.at("mismatch", "Not a palindrome");
      return t.result(false);
    }
    t.at("compare", `${x} = ${y} at position ${i}`);
    a.mark(i, "done");
    r.mark(i, "done");
  }
  t.at("done", "Every position matches: a palindrome");
  t.result(true);
}

/** Palindrome check with two indices walking in from both ends: no copy, and it stops at the middle. */
export function twoIndices(t: Tracer, { s }: In) {
  const a = t.array("s", [...s]);
  const i = t.pointer("i", a, 0);
  const j = t.pointer("j", a, s.length - 1);
  t.at("start", s.length ? `Is "${s}" the same backwards?` : "An empty string reads the same both ways");
  while (i.at < j.at) {
    t.count();
    const x = s[i.at]!;
    const y = s[j.at]!;
    a.mark(i.at, "compare");
    a.mark(j.at, "compare");
    if (x !== y) {
      t.at("compare", `${x} ≠ ${y}`);
      a.mark(i.at, "bad");
      a.mark(j.at, "bad");
      t.at("mismatch", "Not a palindrome: stop at the first mismatch");
      return t.result(false);
    }
    t.at("compare", `${x} = ${y}`);
    a.mark(i.at, "done");
    a.mark(j.at, "done");
    i.move(1);
    j.move(-1);
  }
  t.at("done", "The indices met in the middle: a palindrome");
  t.result(true);
}

/** Anagram check by letter counts: add one for each letter of s, take one away for each letter of t. */
export function letterCounts(t: Tracer, { s, t: other }: In) {
  const a = t.array("s", [...s]);
  const b = t.array("t", [...other]);
  const counts = t.map("counts");
  t.at("start", `Is "${other}" an anagram of "${s}"?`);
  if (s.length !== other.length) {
    t.at("length", `${s.length} letters against ${other.length}: not an anagram`);
    return t.result(false);
  }
  for (let i = 0; i < s.length; i++) {
    t.count();
    const ch = s[i]!;
    counts.put(ch, ((counts.get(ch) as number | null) ?? 0) + 1);
    a.clearMarks();
    counts.clearMarks();
    a.mark(i, "active");
    counts.mark(ch, "active");
    t.at("count", `${ch}: ${counts.get(ch)}`);
  }
  a.clearMarks();
  for (let i = 0; i < other.length; i++) {
    t.count();
    const ch = other[i]!;
    counts.put(ch, ((counts.get(ch) as number | null) ?? 0) - 1);
    b.clearMarks();
    counts.clearMarks();
    b.mark(i, "active");
    counts.mark(ch, "active");
    t.at("uncount", `${ch}: ${counts.get(ch)}`);
  }
  b.clearMarks();
  for (const ch of counts.keys()) {
    t.count();
    counts.clearMarks();
    if (counts.get(ch) !== 0) {
      counts.mark(ch, "bad");
      t.at("check", `${ch} is ${counts.get(ch)}, not 0`);
      t.at("differ", "The letters differ: not an anagram");
      return t.result(false);
    }
    counts.mark(ch, "done");
    t.at("check", `${ch}: 0`);
  }
  t.at("done", "Every count is back to 0: an anagram");
  t.result(true);
}
