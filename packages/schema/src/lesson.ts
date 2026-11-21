import { z } from "zod";
import type { Model } from "./model";
import { SubjectId } from "./subject";

const Point = z.tuple([z.number(), z.number()]);
const Rect = z.object({ x: z.number(), y: z.number(), w: z.number().positive(), h: z.number().positive() });

/** Each kind of diagram the stage can play. A lesson's scene names one. */
export const SCENE_KINDS = ["cache-aside", "cdn", "latency", "queue", "chain", "estimate"] as const;
export type SceneKind = (typeof SCENE_KINDS)[number];

/** The `sim.mode` values each scene kind understands. */
export const SCENE_MODES: Record<SceneKind, readonly string[]> = {
  "cache-aside": ["none", "warm", "steady", "storm", "jitter"],
  cdn: ["none", "direct", "warm", "steady", "stale", "purge"],
  latency: ["none", "average", "histogram", "fanout", "hedge"],
  queue: ["none", "steady"],
  chain: ["none", "steady", "shared"],
  estimate: ["none", "steady"],
};

export const SceneNode = Rect.extend({
  kind: z.enum(["users", "lb", "app", "cache", "db", "edge", "origin", "services", "histogram", "curve"]),
  label: z.string(),
  sub: z.string(),
  hidden: z.boolean().optional(),
});
export type SceneNode = z.infer<typeof SceneNode>;

export const SceneSpec = z.object({
  kind: z.enum(SCENE_KINDS),
  world: z.object({ w: z.number().positive(), h: z.number().positive() }),
  bounds: Rect,
  /** Labelled background boxes, such as "Mumbai" and "Virginia, USA". */
  regions: z.array(Rect.extend({ id: z.string(), label: z.string() })).optional(),
  nodes: z.record(z.string(), SceneNode),
  wires: z.record(
    z.string(),
    z.object({
      from: Point,
      to: Point,
      /** Packet speed multiplier on this wire; below 1 makes a long-haul link visibly slower. */
      pace: z.number().positive().optional(),
      /** Text drawn at the wire's midpoint, such as "13,000 km". */
      label: z.string().optional(),
    }),
  ),
});
export type SceneSpec = z.infer<typeof SceneSpec>;

export const Control = z.object({
  label: z.string(),
  min: z.number(),
  max: z.number(),
  step: z.number().positive().optional(),
  unit: z.string().optional(),
  /** One line under the control, quoting outputs, e.g. "{dbReads} database reads a second". */
  readout: z.string().optional(),
});
export type Control = z.infer<typeof Control>;

export const Step = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  tag: z.enum(["problem", "technique", "solution", "recap"]),
  title: z.string().min(1),
  short: z.string().min(1),
  /** Paragraphs. Plain text with **bold** and {output} placeholders only. */
  text: z.array(z.string()).min(1),
  note: z.object({ kind: z.enum(["watch", "idea", "turn", "tip", "next"]), text: z.string() }).optional(),
  changed: z.array(z.object({ kind: z.enum(["add", "mod", "del"]), label: z.string(), value: z.string().optional() })).optional(),
  scene: z.object({ add: z.array(z.string()).optional(), remove: z.array(z.string()).optional(), focus: z.array(z.string()).optional() }).optional(),
  /** `mode` must be one of SCENE_MODES for the lesson's scene kind (checked by checkContent). */
  sim: z.object({ mode: z.string(), speed: z.number().positive() }).optional(),
  model: z.record(z.string(), z.number()).optional(),
  controls: z.array(z.string()).optional(),
  live: z.string(),
});
export type Step = z.infer<typeof Step>;

const ModelSchema = z.custom<Model>(
  (v) => typeof v === "object" && v !== null && typeof (v as Model).run === "function" && typeof (v as Model).defaults === "object",
  "must be a model with defaults and run()",
);

export const Lesson = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  home: SubjectId,
  slug: z.string().regex(/^[a-z0-9-]+$/),
  topic: z.string().min(1),
  title: z.string().min(1),
  promise: z.string().min(1),
  minutes: z.number().int().positive(),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  scene: SceneSpec,
  model: ModelSchema,
  controls: z.record(z.string(), Control),
  steps: z.array(Step).min(1),
  components: z.array(z.string()),
  buildsOn: z.array(z.string()),
  questions: z.array(z.string()),
  cheatsheetInputs: z.record(z.string(), z.number()).optional(),
  cheatsheet: z.array(z.object({ heading: z.string().min(1), text: z.array(z.string()).min(1) })),
});
export type Lesson = z.infer<typeof Lesson>;
