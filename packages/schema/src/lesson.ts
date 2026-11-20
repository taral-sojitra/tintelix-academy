import { z } from "zod";
import type { Model } from "./model";
import { SubjectId } from "./subject";

const Point = z.tuple([z.number(), z.number()]);
const Rect = z.object({ x: z.number(), y: z.number(), w: z.number().positive(), h: z.number().positive() });

export const SceneSpec = z.object({
  world: z.object({ w: z.number().positive(), h: z.number().positive() }),
  bounds: Rect,
  nodes: z.record(
    z.string(),
    Rect.extend({
      kind: z.enum(["users", "lb", "app", "cache", "db"]),
      label: z.string(),
      sub: z.string(),
      hidden: z.boolean().optional(),
    }),
  ),
  wires: z.record(z.string(), z.object({ from: Point, to: Point })),
});
export type SceneSpec = z.infer<typeof SceneSpec>;

export const Control = z.object({
  label: z.string(),
  min: z.number(),
  max: z.number(),
  step: z.number().positive().optional(),
  unit: z.string().optional(),
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
  sim: z.object({ mode: z.enum(["none", "warm", "steady", "storm", "jitter"]), speed: z.number().positive() }).optional(),
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
