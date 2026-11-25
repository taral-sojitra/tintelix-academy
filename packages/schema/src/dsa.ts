import { z } from "zod";

/** A value a traced structure or variable can hold. */
export type Value = number | string | boolean | null;

/** How a cell, node or item is drawn in a frame. */
export const MARKS = ["active", "compare", "done", "visited", "queued", "found", "bad", "dim"] as const;
export type Mark = (typeof MARKS)[number];

/** One structure's state in a frame. More kinds arrive with the lessons that first need them (LLD §12). */
export type Snapshot =
  | { kind: "array"; values: Value[]; marks: (Mark | null)[] }
  | { kind: "grid"; rows: Value[][]; marks: (Mark | null)[][] }
  | { kind: "map"; entries: [string, Value][]; marks: (Mark | null)[] }
  | { kind: "calls"; frames: CallFrame[] }
  | { kind: "tree"; root: string | null; nodes: TreeNode[] }
  | { kind: "list"; head: string | null; nodes: ListNode[]; tags: { name: string; at: string }[] }
  | { kind: "stack"; items: Value[]; marks: (Mark | null)[] }
  | { kind: "queue"; items: Value[]; marks: (Mark | null)[] };

/** A linked-list node; nodes keep the order they were made in, so a re-pointed arrow shows. */
export interface ListNode {
  id: string;
  value: Value;
  next: string | null;
  mark: Mark | null;
}

/** One waiting call on the call stack: `fn(args)`, and what it returned once it has. */
export interface CallFrame {
  fn: string;
  args: string;
  ret?: Value;
}

/** A node of a call tree (children) or a binary tree (left and right); `sub` is a small second label. */
export interface TreeNode {
  id: string;
  label: string;
  sub?: string;
  children?: string[];
  left?: string | null;
  right?: string | null;
  mark: Mark | null;
}

/** A named index shown under a structure, such as `left` under cell 3. */
export interface Pointer {
  name: string;
  on: string;
  at: number;
}

/** One recorded move: the state just after the line `site` ran. */
export interface Frame {
  site: string;
  note: string;
  structs: Record<string, Snapshot>;
  pointers: Pointer[];
  vars: Record<string, Value>;
  /** The step counter so far. */
  steps: number;
}

/** A frame named by the site it ran and which visit, counted from 1; "start" and "end" are the run's ends. */
export const Anchor = z.union([z.literal("start"), z.literal("end"), z.object({ site: z.string().min(1), nth: z.number().int().positive().optional() })]);
export type Anchor = z.infer<typeof Anchor>;

/** One field of a lesson's custom input form. Field order is argument order for the listings. */
export const Field = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("ints"),
    label: z.string().min(1),
    min: z.number().int(),
    max: z.number().int(),
    length: z.tuple([z.number().int().min(0), z.number().int().positive()]),
    sorted: z.boolean().optional(),
    distinct: z.boolean().optional(),
  }),
  z.object({ kind: z.literal("int"), label: z.string().min(1), min: z.number().int(), max: z.number().int() }),
  z.object({ kind: z.literal("text"), label: z.string().min(1), alphabet: z.enum(["a-z", "brackets"]), length: z.tuple([z.number().int().min(0), z.number().int().positive()]) }),
]);
export type Field = z.infer<typeof Field>;
export const InputSpec = z.record(z.string(), Field);
export type InputSpec = z.infer<typeof InputSpec>;

export const DsaRun = z.object({
  /** The algorithm's export name in the lesson's algo file. */
  algo: z.string().min(1),
  label: z.string().min(1),
  /** The listing key in the lesson's listings file. */
  listing: z.string().min(1),
  time: z.string().min(1),
  space: z.string().min(1),
  /** The input fields the listing takes, in order; all of them when absent. */
  args: z.array(z.string().min(1)).optional(),
  /** A run that never finishes on purpose (no base case): the build checks it reaches the frame limit and doesn't run its listings. */
  endless: z.literal(true).optional(),
});
export type DsaRun = z.infer<typeof DsaRun>;

export const DsaPreset = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  label: z.string().min(1),
  input: z.record(z.string(), z.unknown()),
  expect: z.unknown(),
  /** Per-run expected results, for a lesson whose runs answer different questions. */
  expectByRun: z.record(z.string(), z.unknown()).optional(),
  edge: z.enum(["empty", "one", "dupes", "none", "worst"]).optional(),
});
export type DsaPreset = z.infer<typeof DsaPreset>;

const frameFn = z.custom<(next: Frame) => number>((v) => typeof v === "function", "must be a function of the next frame");

export const DsaPredict = z.object({
  /** Playback pauses on this frame. */
  at: Anchor,
  ask: z.string().min(1),
  options: z.array(z.string().min(1)).min(2).max(4),
  answer: z.number().int().min(0),
  /** Which option the frame after `at` shows; the build checks it equals `answer`. */
  check: frameFn,
});
export type DsaPredict = z.infer<typeof DsaPredict>;

export const DsaStep = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  part: z.enum(["method", "problem", "slow", "pattern", "spot", "breaks", "practice", "recap"]),
  title: z.string().min(1),
  short: z.string().min(1),
  /** Paragraphs; **bold** and {<run>Steps} only. */
  text: z.array(z.string().min(1)).min(1),
  run: z.string().optional(),
  preset: z.string().optional(),
  from: Anchor.optional(),
  to: Anchor.optional(),
  /** Two runs whose step counters sit side by side. */
  compare: z.tuple([z.string(), z.string()]).optional(),
  predict: DsaPredict.optional(),
  note: z.object({ kind: z.enum(["watch", "idea", "turn", "tip", "next"]), text: z.string() }).optional(),
});
export type DsaStep = z.infer<typeof DsaStep>;

export const PatternCard = z.object({
  signal: z.string().min(1).max(139),
  reachFor: z.string().min(1).max(139),
  askYourself: z.string().min(1).max(139),
  whyItWorks: z.string().min(1).max(139),
  trap: z.string().min(1).max(139),
});
export type PatternCard = z.infer<typeof PatternCard>;

export const DsaPractice = z.object({ slug: z.string().regex(/^[a-z0-9-]+$/), core: z.boolean() });
export type DsaPractice = z.infer<typeof DsaPractice>;

export const DsaLesson = z.object({
  id: z.string().regex(/^dsa-[a-z0-9-]+$/),
  home: z.literal("dsa"),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  topic: z.string().min(1),
  title: z.string().min(1).max(40),
  promise: z.string().min(1),
  minutes: z.number().int().positive(),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  runs: z.record(z.string(), DsaRun),
  presets: z.array(DsaPreset).min(2).max(6),
  input: InputSpec,
  /** What the step counter counts, such as "Pairs checked". */
  counter: z.string().min(1),
  steps: z.array(DsaStep).min(1),
  card: PatternCard.optional(),
  practice: z.array(DsaPractice).max(5),
  /** When several answers are right (any pair, any order), results are checked with this instead of `expect`. */
  accept: z.custom<(input: Record<string, unknown>, result: unknown) => boolean>((v) => typeof v === "function").optional(),
  /** Clarifying questions that change the tool, for the cheatsheet. */
  ask: z.array(z.string().min(1)),
  buildsOn: z.array(z.string()),
  questions: z.array(z.string()),
  cheatsheet: z.array(z.object({ heading: z.string().min(1), text: z.array(z.string().min(1)).min(1) })).min(1),
});
export type DsaLesson = z.infer<typeof DsaLesson>;
