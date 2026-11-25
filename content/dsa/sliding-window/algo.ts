import type { Tracer } from "@tintelix/dsa";

type In = { s: string; k: number };
const isVowel = (ch: string) => "aeiou".includes(ch);
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** Maximum vowels in any k letters: fill the first window, then each slide adds one letter and drops one. */
export function fixedWindow(t: Tracer, { s, k }: In) {
  const a = t.array("s", [...s]);
  t.set("k", k);
  t.set("vowels", 0);
  t.set("best", 0);
  if (s.length < k) {
    t.at("short", `Fewer than ${k} letters: no full window`);
    return t.result(0);
  }
  const left = t.pointer("left", a, 0);
  const right = t.pointer("right", a, 0);
  const paint = () => {
    a.clearMarks();
    for (let i = left.at; i <= right.at; i++) a.mark(i, isVowel(s[i]!) ? "found" : "active");
  };
  let count = 0;
  t.at("start", `Windows of ${k} letters: which holds the most vowels?`);
  for (let i = 0; i < k; i++) {
    t.count();
    right.to(i);
    if (isVowel(s[i]!)) count++;
    t.set("vowels", count);
    paint();
    t.at("fill", `${s[i]}${isVowel(s[i]!) ? " is a vowel" : ""}: ${plural(count, "vowel")} so far`);
  }
  let best = count;
  t.set("best", best);
  for (let r = k; r < s.length; r++) {
    t.count();
    const inc = s[r]!;
    const out = s[r - k]!;
    count += (isVowel(inc) ? 1 : 0) - (isVowel(out) ? 1 : 0);
    best = Math.max(best, count);
    left.to(r - k + 1);
    right.to(r);
    t.set("vowels", count);
    t.set("best", best);
    paint();
    t.at("slide", `${inc} comes in, ${out} goes out: ${plural(count, "vowel")}`);
  }
  a.clearMarks();
  t.at("done", `The best window holds ${plural(best, "vowel")}`);
  t.result(best);
}

/** Longest run with no repeats, the slow way: start again from every position and walk until a letter repeats. */
export function everyStart(t: Tracer, { s }: In) {
  const a = t.array("s", [...s]);
  const seen = t.map("seen");
  const i = t.pointer("i", a, 0);
  const j = t.pointer("j", a, 0);
  let best = 0;
  t.set("best", 0);
  t.at("start", s.length ? "Try a run starting at every position" : "No letters at all");
  for (; i.at < s.length; i.move(1)) {
    for (const key of seen.keys()) seen.remove(key);
    j.to(i.at);
    a.clearMarks();
    t.at("restart", `Start again from position ${i.at}, with nothing seen`);
    for (; j.at < s.length; j.move(1)) {
      t.count();
      const ch = s[j.at]!;
      if (seen.has(ch)) {
        a.mark(j.at, "bad");
        t.at("repeat", `${ch} repeats: the run from ${i.at} stops at ${j.at - i.at} letters`);
        break;
      }
      seen.put(ch, j.at);
      best = Math.max(best, j.at - i.at + 1);
      t.set("best", best);
      a.mark(j.at, "active");
      t.at("look", `${ch} is new: the run is ${j.at - i.at + 1} long`);
    }
  }
  a.clearMarks();
  t.at("done", `The longest run with no repeats has ${plural(best, "letter")}`);
  t.result(best);
}

/** Longest run with no repeats in one sweep: right grows the window; on a repeat, left shrinks it until the repeat is gone. */
export function growShrink(t: Tracer, { s }: In) {
  const a = t.array("s", [...s]);
  const win = t.map("window");
  const left = t.pointer("left", a, 0);
  const right = t.pointer("right", a, 0);
  const paint = (to: number) => {
    a.clearMarks();
    for (let i = left.at; i <= to; i++) a.mark(i, "active");
  };
  let best = 0;
  t.set("best", 0);
  t.at("start", s.length ? "The window starts empty at the left" : "No letters at all");
  for (; right.at < s.length; right.move(1)) {
    const ch = s[right.at]!;
    while (win.has(ch)) {
      t.count();
      const out = s[left.at]!;
      win.remove(out);
      left.move(1);
      paint(right.at - 1);
      a.mark(right.at, "bad");
      t.at("shrink", `${ch} is already inside: drop ${out} from the left`);
    }
    t.count();
    win.put(ch, right.at);
    best = Math.max(best, right.at - left.at + 1);
    t.set("best", best);
    paint(right.at);
    t.at("grow", `Add ${ch}: "${s.slice(left.at, right.at + 1)}" has no repeats`);
  }
  a.clearMarks();
  t.at("done", `The longest run with no repeats has ${plural(best, "letter")}`);
  t.result(best);
}
