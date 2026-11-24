import { z } from "zod";

/** One task in a SQL lesson. Read tasks compare results; change and define tasks compare a verify query run afterwards. */
export const SqlTask = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    prompt: z.string().min(1),
    starter: z.string().min(1),
    hint: z.string().min(1),
    solution: z.string().min(1),
    /** The query whose result is the answer, when it isn't the solution itself. */
    answer: z.string().optional(),
    ordered: z.boolean(),
    /** Column names the task asks for, in order; only then are names checked. */
    namedColumns: z.array(z.string()).optional(),
    /** Run after the learner's statement and after the solution; their results must match. */
    verify: z.string().optional(),
    kind: z.enum(["read", "change", "define"]).optional(),
  })
  .refine((t) => (t.kind ?? "read") === "read" || !!t.verify, { message: "change and define tasks need a verify query" });
export type SqlTask = z.infer<typeof SqlTask>;

export const SqlLesson = z.object({
  id: z.string().regex(/^sql-[a-z0-9-]+$/),
  home: z.literal("sql"),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  topic: z.string().min(1),
  title: z.string().min(1).max(40),
  promise: z.string().min(1),
  minutes: z.number().int().positive(),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  explain: z.array(z.string().min(1)).min(1),
  syntax: z.object({ code: z.string().min(1), notes: z.array(z.string()) }),
  mistake: z.string().min(1),
  tasks: z.array(SqlTask).min(3).max(5),
  buildsOn: z.array(z.string()),
  cheatsheet: z.array(z.object({ heading: z.string(), text: z.array(z.string()) })).min(1),
});
export type SqlLesson = z.infer<typeof SqlLesson>;
