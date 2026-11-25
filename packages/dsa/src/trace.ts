import type { Frame, Mark, Pointer, Snapshot, Value } from "@tintelix/schema";

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

/** A named index into an array, drawn under the cell it points at. */
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
  const pointers: { name: string; on: string; at: number; hidden: boolean }[] = [];
  const vars: Record<string, Value> = {};
  let steps = 0;
  let result: unknown = undefined;

  const snapshot = (): Record<string, Snapshot> => {
    const out: Record<string, Snapshot> = {};
    for (const [id, a] of arrays) out[id] = { kind: "array", values: [...a.values], marks: [...a.marks] };
    for (const [id, g] of grids) out[id] = { kind: "grid", rows: g.rows.map((r) => [...r]), marks: g.marks.map((r) => [...r]) };
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
