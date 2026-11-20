import type { Lesson, Subject } from "@tintelix/schema";
import { components } from "./components";
import { subjects } from "./subjects";
import { caching } from "./system-design/caching/lesson";

export { components, subjects };

/** Every written lesson. A lesson listed in a subject but missing here is "coming soon". */
export const lessons: Lesson[] = [caching];

export function getSubject(id: string): Subject | undefined {
  return subjects.find((s) => s.id === id);
}

export function getLesson(subject: string, slug: string): Lesson | undefined {
  return lessons.find((l) => l.home === subject && l.slug === slug);
}

export interface LessonSummary {
  id: string;
  slug: string;
  topic: string;
  title?: string;
  summary: string;
  module: string;
  order: number;
  available: boolean;
}

/** Lessons of a subject in teaching order, numbered from 1. */
export function lessonSummaries(subjectId: string): LessonSummary[] {
  const subject = getSubject(subjectId);
  if (!subject) return [];
  let order = 0;
  return subject.modules.flatMap((m) =>
    m.lessons.map((stub) => ({
      id: stub.id,
      slug: stub.slug,
      topic: stub.topic,
      ...(stub.title ? { title: stub.title } : {}),
      summary: stub.summary,
      module: m.title,
      order: ++order,
      available: lessons.some((l) => l.id === stub.id),
    })),
  );
}
