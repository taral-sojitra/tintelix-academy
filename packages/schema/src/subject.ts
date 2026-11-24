import { z } from "zod";

export const SUBJECT_IDS = ["system-design", "networks", "apis", "linux", "microservices", "sql", "dsa"] as const;
export const SubjectId = z.enum(SUBJECT_IDS);
export type SubjectId = z.infer<typeof SubjectId>;

/** A lesson as the subject lists it; the lesson file may not exist yet. */
export const LessonStub = z.object({
  id: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  topic: z.string().min(1),
  /** Hook title, when one has been written. */
  title: z.string().max(40).optional(),
  summary: z.string(),
  buildsOn: z.array(z.string()),
  /** The subject the lesson lives in, when another subject lists it too (a shared lesson). */
  home: SubjectId.optional(),
});
export type LessonStub = z.infer<typeof LessonStub>;

export const Subject = z.object({
  id: SubjectId,
  title: z.string().min(1),
  blurb: z.string(),
  phase: z.number().int().min(1).optional(),
  modules: z.array(z.object({ title: z.string().min(1), lessons: z.array(LessonStub) })),
});
export type Subject = z.infer<typeof Subject>;
