import type { TCalls, Tracer, TTree } from "@tintelix/dsa";

type In = { n: number };

/** factorial(n) = n × factorial(n − 1), stopping at 1: the calls pile up on the stack, then unwind. */
export function factorial(t: Tracer, { n }: In) {
  const calls = t.calls("calls");
  const go = (k: number): number => {
    t.count();
    calls.push("factorial", String(k));
    t.at("call", `factorial(${k}) starts and waits on the stack`);
    if (k <= 1) {
      calls.ret(1);
      t.at("base", `factorial(${k}) is the base case: it answers 1 straight away`);
      calls.pop();
      return 1;
    }
    const v = k * go(k - 1);
    calls.ret(v);
    t.at("ret", `factorial(${k}) = ${k} × factorial(${k - 1}) = ${v}`);
    calls.pop();
    return v;
  };
  t.result(go(n));
}

/** factorial with the base case left out: every call makes another, smaller one, forever. */
export function noBase(t: Tracer, { n }: In) {
  const calls = t.calls("calls");
  const go = (k: number): number => {
    t.count();
    calls.push("factorial", String(k));
    t.at("call", `factorial(${k}) calls factorial(${k - 1}) and waits`);
    const v = k * go(k - 1);
    calls.ret(v);
    t.at("ret", `factorial(${k}) = ${v}`);
    calls.pop();
    return v;
  };
  t.result(go(n));
}

/** One fib call: on the stack, and as a node of the call tree under the call that made it, which now waits. */
function enter(t: Tracer, calls: TCalls, tree: TTree, ids: { n: number }, k: number, parent: string | undefined, repeats: Set<string>) {
  t.count();
  const id = `c${++ids.n}`;
  calls.push("fib", String(k));
  tree.node(id, `f(${k})`, parent);
  tree.mark(id, "active");
  if (parent && !repeats.has(parent)) tree.mark(parent, "compare");
  return id;
}
function leave(calls: TCalls, tree: TTree, id: string, v: number, mark: "done" | "found" = "done") {
  calls.ret(v);
  tree.sub(id, `= ${v}`);
  tree.mark(id, mark);
}

/** fib(n) = fib(n − 1) + fib(n − 2), written straight from the definition: the same calls happen again and again. */
export function fibNaive(t: Tracer, { n }: In) {
  const tree = t.tree("calls");
  const calls = t.calls("stack");
  const ids = { n: 0 };
  const seen = new Set<number>();
  const repeats = new Set<string>();
  const go = (k: number, parent?: string): number => {
    const id = enter(t, calls, tree, ids, k, parent, repeats);
    const again = seen.has(k);
    if (again) {
      repeats.add(id);
      tree.mark(id, "bad");
    }
    t.at("call", again ? `fib(${k}) again: this was already worked out once` : `fib(${k}) starts`);
    if (k <= 1) {
      leave(calls, tree, id, k);
      if (again) tree.mark(id, "bad");
      seen.add(k);
      t.at("base", `fib(${k}) is a base case: ${k}`);
      calls.pop();
      return k;
    }
    const v = go(k - 1, id) + go(k - 2, id);
    leave(calls, tree, id, v);
    if (again) tree.mark(id, "bad");
    seen.add(k);
    t.at("ret", `fib(${k}) = fib(${k - 1}) + fib(${k - 2}) = ${v}`);
    calls.pop();
    return v;
  };
  t.result(go(n));
}

/** fib with a memo: each answer is stored the first time and read back after, so every fib(k) is worked out once. */
export function fibMemo(t: Tracer, { n }: In) {
  const tree = t.tree("calls");
  const calls = t.calls("stack");
  const memo = t.map("memo");
  const ids = { n: 0 };
  const none = new Set<string>();
  t.at("start", `fib(${n}), with an empty memo`);
  const go = (k: number, parent?: string): number => {
    const id = enter(t, calls, tree, ids, k, parent, none);
    t.at("call", `fib(${k}) starts: is it in the memo?`);
    const key = String(k);
    if (memo.has(key)) {
      const v = memo.get(key) as number;
      leave(calls, tree, id, v, "found");
      memo.clearMarks();
      memo.mark(key, "found");
      t.at("memo", `fib(${k}) is in the memo: ${v}, no more calls`);
      memo.clearMarks();
      calls.pop();
      return v;
    }
    if (k <= 1) {
      leave(calls, tree, id, k);
      t.at("base", `fib(${k}) is a base case: ${k}`);
      calls.pop();
      return k;
    }
    const v = go(k - 1, id) + go(k - 2, id);
    memo.put(key, v);
    leave(calls, tree, id, v);
    memo.clearMarks();
    memo.mark(key, "active");
    t.at("ret", `fib(${k}) = ${v}: stored in the memo`);
    memo.clearMarks();
    calls.pop();
    return v;
  };
  const v = go(n);
  t.at("done", `fib(${n}) = ${v}`);
  t.result(v);
}
