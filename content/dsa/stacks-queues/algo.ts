import type { Tracer } from "@tintelix/dsa";

type In = { s: string; temps: number[]; pings: number[] };
const PAIRS = ["()", "[]", "{}"];
const OPEN: Record<string, string> = { ")": "(", "]": "[", "}": "{" };

/** Brackets the slow way: keep deleting a matched pair that sits side by side until none is left. */
export function removePairs(t: Tracer, { s }: In) {
  t.array("s", [...s]);
  t.at("start", s ? `Delete matched pairs from ${s} until none is left` : "No brackets: nothing to match");
  let found = true;
  while (found) {
    found = false;
    for (const p of PAIRS) {
      const i = s.indexOf(p);
      t.count(i < 0 ? s.length : i + 2);
      if (i < 0) continue;
      s = s.slice(0, i) + s.slice(i + 2);
      t.array("s", [...s]);
      found = true;
      t.at("remove", `Delete ${p}, then read the brackets again: ${s || "nothing left"}`);
    }
  }
  t.at("done", s ? `${s} is left: the brackets don't match` : "Nothing is left: every bracket matched");
  t.result(s === "");
}

/** Brackets with a stack: push each opener; a closer must match the opener on top. */
export function bracketStack(t: Tracer, { s }: In) {
  const a = t.array("s", [...s]);
  const stack = t.stack("stack");
  const i = t.pointer("i", a, 0);
  t.at("start", s ? "Read the brackets left to right" : "No brackets: nothing to match");
  for (; i.at < s.length; i.move(1)) {
    t.count();
    const ch = s[i.at]!;
    a.clearMarks();
    a.mark(i.at, "active");
    if (!(ch in OPEN)) {
      stack.push(ch);
      t.at("push", `${ch} opens: push it`);
      continue;
    }
    if (stack.size === 0 || stack.peek() !== OPEN[ch]) {
      a.mark(i.at, "bad");
      if (stack.size) stack.mark(stack.size - 1, "bad");
      t.at("mismatch", stack.size ? `${ch} can't close ${stack.peek()}: no match` : `${ch} has nothing to close: no match`);
      return t.result(false);
    }
    stack.pop();
    a.mark(i.at, "done");
    t.at("pop", `${ch} closes the ${OPEN[ch]} on top: pop it`);
  }
  a.clearMarks();
  t.at("done", stack.size ? `${stack.size} bracket${stack.size === 1 ? " is" : "s are"} never closed: no match` : "The stack is empty: every bracket matched");
  t.result(stack.size === 0);
}

/** Number of Recent Calls: a queue holds the pings from the last 3000 ms; old ones leave from the front. */
export function recentCalls(t: Tracer, { pings }: In) {
  const a = t.array("pings", pings);
  const counts = t.array("counts", Array(pings.length).fill(null));
  const q = t.queue("queue");
  const out: number[] = [];
  t.at("start", pings.length ? "For each ping, count the pings in the last 3000 ms" : "No pings");
  for (let k = 0; k < pings.length; k++) {
    t.count();
    const now = pings[k]!;
    a.clearMarks();
    a.mark(k, "active");
    q.push(now);
    t.at("ping", `Ping at ${now}: join the back of the queue`);
    while ((q.front() as number) < now - 3000) {
      t.count();
      const old = q.shift();
      t.at("drop", `${old} is older than ${now} − 3000 = ${now - 3000}: it leaves from the front`);
    }
    out.push(q.size);
    counts.put(k, q.size);
    counts.clearMarks();
    counts.mark(k, "found");
  }
  a.clearMarks();
  t.at("done", pings.length ? `Counts: ${out.join(", ")}` : "No pings, no counts");
  t.result(out);
}

/** Daily Temperatures the slow way: from each day, look ahead until a warmer day. */
export function scanAhead(t: Tracer, { temps }: In) {
  const a = t.array("temps", temps);
  const wait = t.array("wait", Array(temps.length).fill(0));
  const i = t.pointer("day", a, 0);
  const j = t.pointer("ahead", a, -1);
  t.at("start", temps.length ? "For each day, look ahead for a warmer one" : "No days");
  for (; i.at < temps.length; i.move(1)) {
    for (j.to(i.at + 1); j.at < temps.length; j.move(1)) {
      t.count();
      a.clearMarks();
      a.mark(i.at, "active");
      a.mark(j.at, "compare");
      if (temps[j.at]! > temps[i.at]!) {
        wait.put(i.at, j.at - i.at);
        wait.mark(i.at, "found");
        t.at("look", `${temps[j.at]} > ${temps[i.at]}: day ${i.at} waits ${j.at - i.at}`);
        break;
      }
      t.at("look", `${temps[j.at]} isn't warmer than ${temps[i.at]}`);
    }
  }
  a.clearMarks();
  t.at("done", "Every day has its answer; 0 means no warmer day comes");
  t.result(Array.from({ length: temps.length }, (_, k) => wait.get(k)));
}

/** Daily Temperatures with a monotonic stack: days still waiting stay on a stack, coolest on top; a warmer day answers them. */
export function monotonic(t: Tracer, { temps }: In) {
  const a = t.array("temps", temps);
  const wait = t.array("wait", Array(temps.length).fill(0));
  const stack = t.stack("waiting");
  const days: number[] = [];
  t.at("start", temps.length ? "Days still waiting for a warmer day go on a stack" : "No days");
  for (let i = 0; i < temps.length; i++) {
    a.clearMarks();
    a.mark(i, "active");
    while (days.length && temps[i]! > temps[days.at(-1)!]!) {
      t.count();
      const d = days.pop()!;
      stack.pop();
      wait.put(d, i - d);
      wait.clearMarks();
      wait.mark(d, "found");
      t.at("resolve", `${temps[i]} is warmer than day ${d}'s ${temps[d]}: day ${d} waits ${i - d}`);
    }
    t.count();
    days.push(i);
    stack.push(`${i}: ${temps[i]}`);
    t.at("push", `Day ${i} (${temps[i]}) waits on the stack`);
  }
  a.clearMarks();
  t.at("done", "Days left on the stack never see a warmer day: they keep 0");
  t.result(Array.from({ length: temps.length }, (_, k) => wait.get(k)));
}
