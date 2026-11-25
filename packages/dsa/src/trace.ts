import type { CallFrame, Frame, ListNode, Mark, Pointer, Snapshot, TreeNode, Value } from "@tintelix/schema";

/** The most frames one run may record; a run that reaches it is stopped. */
export const FRAME_LIMIT = 400;

/** An array the tracer watches: reads and writes go through it so each frame can copy its state. */
export interface TArray {
  readonly id: string;
  readonly length: number;
  get(i: number): Value;
  put(i: number, v: Value): void;
  mark(i: number, m: Mark | null): void;
  clearMarks(): void;
}

/** A grid of rows the tracer watches; cells start empty. */
export interface TGrid {
  readonly id: string;
  readonly rows: number;
  readonly cols: number;
  get(r: number, c: number): Value;
  put(r: number, c: number, v: Value): void;
  mark(r: number, c: number, m: Mark | null): void;
  clearMarks(): void;
}

/** A key–value map the tracer watches; entries keep the order they were first set. */
export interface TMap {
  readonly id: string;
  get(key: string): Value;
  has(key: string): boolean;
  put(key: string, v: Value): void;
  remove(key: string): void;
  mark(key: string, m: Mark | null): void;
  clearMarks(): void;
  keys(): string[];
}

/** A named index into an array, drawn under the cell it points at. */
/** A call stack: push on entering a call, `ret` once it has its answer, pop when it hands it back. */
export interface TCalls {
  readonly id: string;
  readonly depth: number;
  push(fn: string, args: string): void;
  ret(value: Value): void;
  pop(): void;
}

/** A tree drawn top down: a call tree (children in order) or, once any child is attached to a side, a binary tree. */
export interface TTree {
  readonly id: string;
  node(id: string, label: string, parent?: string, side?: "left" | "right"): void;
  sub(id: string, text: string | null): void;
  mark(id: string, m: Mark | null): void;
  clearMarks(): void;
}

/** A linked list: nodes, next links, the head, and named tags (prev, curr, slow, fast) on nodes. */
export interface TList {
  readonly id: string;
  add(id: string, value: Value): void;
  link(id: string, next: string | null): void;
  put(id: string, value: Value): void;
  head(id: string | null): void;
  tag(name: string, id: string | null): void;
  mark(id: string, m: Mark | null): void;
  clearMarks(): void;
}

/** A stack (last in, first out) or a queue (first in, first out); index 0 is the bottom or the front. */
export interface TSeq {
  readonly id: string;
  readonly size: number;
  push(v: Value): void;
  mark(i: number, m: Mark | null): void;
  clearMarks(): void;
}
export interface TStack extends TSeq {
  pop(): Value;
  peek(): Value;
}
export interface TQueue extends TSeq {
  shift(): Value;
  front(): Value;
}

export interface TPointer {
  readonly at: number;
  move(by: number): void;
  to(i: number): void;
  hide(): void;
}

export interface Tracer {
  /** The line now running: records one frame of the state just after it ran. */
  at(site: string, note: string): void;
  /** Basic steps, for the step counter. */
  count(n?: number): void;
  /** A variable shown in the data panel. */
  set(name: string, value: Value): void;
  array(id: string, values: Value[]): TArray;
  grid(id: string, rows: number, cols: number): TGrid;
  map(id: string): TMap;
  calls(id: string): TCalls;
  tree(id: string): TTree;
  list(id: string): TList;
  stack(id: string): TStack;
  queue(id: string): TQueue;
  pointer(name: string, on: TArray, at: number): TPointer;
  mark(id: string, index: number, mark: Mark | null): void;
  result(value: unknown): void;
}

/** A lesson algorithm: pure, no randomness, clock or I/O. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Algo = (t: Tracer, input: any) => void;

export interface Trace {
  frames: Frame[];
  result: unknown;
  stopped?: "limit";
}

class Stop {}

interface ArrayState {
  values: Value[];
  marks: (Mark | null)[];
}

/** Runs `algo` on `input` and records its frames. A run that reaches `limit` frames is stopped. */
export function trace<I>(algo: (t: Tracer, input: I) => void, input: I, limit = FRAME_LIMIT): Trace {
  const frames: Frame[] = [];
  const arrays = new Map<string, ArrayState>();
  const grids = new Map<string, { rows: Value[][]; marks: (Mark | null)[][] }>();
  const maps = new Map<string, { entries: Map<string, Value>; marks: Map<string, Mark> }>();
  const stacks = new Map<string, CallFrame[]>();
  type Node = { label: string; sub: string | null; children: string[]; left: string | null; right: string | null; mark: Mark | null };
  const trees = new Map<string, { root: string | null; binary: boolean; nodes: Map<string, Node> }>();
  const lists = new Map<string, { head: string | null; nodes: Map<string, Omit<ListNode, "id">>; tags: Map<string, string> }>();
  const seqs = new Map<string, { kind: "stack" | "queue"; items: Value[]; marks: (Mark | null)[] }>();
  const pointers: { name: string; on: string; at: number; hidden: boolean }[] = [];
  const vars: Record<string, Value> = {};
  let steps = 0;
  let result: unknown = undefined;

  const snapshot = (): Record<string, Snapshot> => {
    const out: Record<string, Snapshot> = {};
    for (const [id, a] of arrays) out[id] = { kind: "array", values: [...a.values], marks: [...a.marks] };
    for (const [id, g] of grids) out[id] = { kind: "grid", rows: g.rows.map((r) => [...r]), marks: g.marks.map((r) => [...r]) };
    for (const [id, tr] of trees)
      out[id] = {
        kind: "tree",
        root: tr.root,
        nodes: [...tr.nodes].map(([nid, n]): TreeNode => ({
          id: nid,
          label: n.label,
          ...(n.sub !== null ? { sub: n.sub } : {}),
          ...(tr.binary ? { left: n.left, right: n.right } : { children: [...n.children] }),
          mark: n.mark,
        })),
      };
    for (const [id, l] of lists)
      out[id] = {
        kind: "list",
        head: l.head,
        nodes: [...l.nodes].map(([nid, n]) => ({ id: nid, ...n })),
        tags: [...l.tags].map(([name, at]) => ({ name, at })),
      };
    for (const [id, q] of seqs) out[id] = { kind: q.kind, items: [...q.items], marks: [...q.marks] };
    for (const [id, c] of stacks) out[id] = { kind: "calls", frames: c.map((f) => ({ ...f })) };
    for (const [id, m] of maps) out[id] = { kind: "map", entries: [...m.entries], marks: [...m.entries.keys()].map((k) => m.marks.get(k) ?? null) };
    return out;
  };
  const shownPointers = (): Pointer[] =>
    pointers
      .filter((p) => !p.hidden && p.at >= 0 && p.at < (arrays.get(p.on)?.values.length ?? 0))
      .map((p) => ({ name: p.name, on: p.on, at: p.at }));

  const t: Tracer = {
    at(site, note) {
      frames.push({ site, note, structs: snapshot(), pointers: shownPointers(), vars: { ...vars }, steps });
      if (frames.length >= limit) throw new Stop();
    },
    count(n = 1) {
      steps += n;
    },
    set(name, value) {
      vars[name] = value;
    },
    array(id, values) {
      const state: ArrayState = { values: [...values], marks: values.map(() => null) };
      arrays.set(id, state);
      return {
        id,
        get length() {
          return state.values.length;
        },
        get: (i) => state.values[i] ?? null,
        put: (i, v) => {
          state.values[i] = v;
        },
        mark: (i, m) => {
          if (i >= 0 && i < state.marks.length) state.marks[i] = m;
        },
        clearMarks: () => state.marks.fill(null),
      };
    },
    grid(id, rows, cols) {
      const g = { rows: Array.from({ length: rows }, () => Array<Value>(cols).fill(null)), marks: Array.from({ length: rows }, () => Array<Mark | null>(cols).fill(null)) };
      grids.set(id, g);
      const inside = (r: number, c: number) => r >= 0 && r < rows && c >= 0 && c < cols;
      return {
        id,
        rows,
        cols,
        get: (r, c) => (inside(r, c) ? g.rows[r]![c]! : null),
        put: (r, c, v) => {
          if (inside(r, c)) g.rows[r]![c] = v;
        },
        mark: (r, c, m) => {
          if (inside(r, c)) g.marks[r]![c] = m;
        },
        clearMarks: () => g.marks.forEach((row) => row.fill(null)),
      };
    },
    map(id) {
      const m = { entries: new Map<string, Value>(), marks: new Map<string, Mark>() };
      maps.set(id, m);
      return {
        id,
        get: (k) => m.entries.get(k) ?? null,
        has: (k) => m.entries.has(k),
        put: (k, v) => void m.entries.set(k, v),
        remove: (k) => {
          m.entries.delete(k);
          m.marks.delete(k);
        },
        mark: (k, mark) => void (mark ? m.marks.set(k, mark) : m.marks.delete(k)),
        clearMarks: () => m.marks.clear(),
        keys: () => [...m.entries.keys()],
      };
    },
    calls(id) {
      const frames: CallFrame[] = [];
      stacks.set(id, frames);
      return {
        id,
        get depth() {
          return frames.length;
        },
        push: (fn, args) => void frames.push({ fn, args }),
        ret: (value) => {
          const top = frames.at(-1);
          if (top) top.ret = value;
        },
        pop: () => void frames.pop(),
      };
    },
    tree(id) {
      const tr = { root: null as string | null, binary: false, nodes: new Map<string, Node>() };
      trees.set(id, tr);
      return {
        id,
        node: (nid, label, parent, side) => {
          tr.nodes.set(nid, { label, sub: null, children: [], left: null, right: null, mark: null });
          const p = parent === undefined ? undefined : tr.nodes.get(parent);
          if (!p) {
            tr.root ??= nid;
            return;
          }
          if (side) {
            tr.binary = true;
            p[side] = nid;
          } else p.children.push(nid);
        },
        sub: (nid, text) => {
          const n = tr.nodes.get(nid);
          if (n) n.sub = text;
        },
        mark: (nid, m) => {
          const n = tr.nodes.get(nid);
          if (n) n.mark = m;
        },
        clearMarks: () => tr.nodes.forEach((n) => (n.mark = null)),
      };
    },
    list(id) {
      const l = { head: null as string | null, nodes: new Map<string, Omit<ListNode, "id">>(), tags: new Map<string, string>() };
      lists.set(id, l);
      return {
        id,
        add: (nid, value) => void l.nodes.set(nid, { value, next: null, mark: null }),
        link: (nid, next) => {
          const n = l.nodes.get(nid);
          if (n) n.next = next;
        },
        put: (nid, value) => {
          const n = l.nodes.get(nid);
          if (n) n.value = value;
        },
        head: (nid) => void (l.head = nid),
        tag: (name, nid) => {
          // A tag moved to null leaves the list; a moved tag keeps its place in the order, so labels don't swap rows.
          if (nid === null) l.tags.delete(name);
          else l.tags.set(name, nid);
        },
        mark: (nid, m) => {
          const n = l.nodes.get(nid);
          if (n) n.mark = m;
        },
        clearMarks: () => l.nodes.forEach((n) => (n.mark = null)),
      };
    },
    stack(id) {
      const q = { kind: "stack" as const, items: [] as Value[], marks: [] as (Mark | null)[] };
      seqs.set(id, q);
      return {
        id,
        get size() {
          return q.items.length;
        },
        push: (v) => {
          q.items.push(v);
          q.marks.push(null);
        },
        pop: () => {
          q.marks.pop();
          return q.items.pop() ?? null;
        },
        peek: () => q.items.at(-1) ?? null,
        mark: (i, m) => void (i >= 0 && i < q.marks.length && (q.marks[i] = m)),
        clearMarks: () => q.marks.fill(null),
      };
    },
    queue(id) {
      const q = { kind: "queue" as const, items: [] as Value[], marks: [] as (Mark | null)[] };
      seqs.set(id, q);
      return {
        id,
        get size() {
          return q.items.length;
        },
        push: (v) => {
          q.items.push(v);
          q.marks.push(null);
        },
        shift: () => {
          q.marks.shift();
          return q.items.shift() ?? null;
        },
        front: () => q.items[0] ?? null,
        mark: (i, m) => void (i >= 0 && i < q.marks.length && (q.marks[i] = m)),
        clearMarks: () => q.marks.fill(null),
      };
    },
    pointer(name, on, at) {
      const p = { name, on: on.id, at, hidden: false };
      pointers.push(p);
      return {
        get at() {
          return p.at;
        },
        move: (by) => {
          p.at += by;
        },
        to: (i) => {
          p.at = i;
        },
        hide: () => {
          p.hidden = true;
        },
      };
    },
    mark(id, index, mark) {
      const a = arrays.get(id);
      if (a && index >= 0 && index < a.marks.length) a.marks[index] = mark;
    },
    result(value) {
      result = value;
    },
  };

  try {
    algo(t, input);
  } catch (e) {
    if (e instanceof Stop) return { frames, result: undefined, stopped: "limit" };
    throw e;
  }
  return { frames, result };
}
