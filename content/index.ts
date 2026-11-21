import type { Lesson, Subject } from "@tintelix/schema";
import { components } from "./components";
import { subjects } from "./subjects";
import { caching } from "./system-design/caching/lesson";
import { cdn } from "./system-design/cdn/lesson";
import { latencyPercentiles } from "./system-design/latency-percentiles/lesson";
import { queueing } from "./system-design/queueing/lesson";
import { availability } from "./system-design/availability/lesson";
import { estimation } from "./system-design/estimation/lesson";
import { scaling } from "./system-design/scaling/lesson";
import { loadBalancing } from "./system-design/load-balancing/lesson";
import { healthChecks } from "./system-design/health-checks/lesson";
import { proxies } from "./system-design/proxies/lesson";
import { indexing } from "./system-design/indexing/lesson";
import { replication } from "./system-design/replication/lesson";
import { sqlVsNosql } from "./system-design/sql-vs-nosql/lesson";
import { statelessServices } from "./system-design/stateless-services/lesson";

export { components, subjects };

/** Every written lesson. A lesson listed in a subject but missing here is "coming soon". */
export const lessons: Lesson[] = [latencyPercentiles, queueing, availability, estimation, scaling, loadBalancing, proxies, healthChecks, statelessServices, caching, cdn, sqlVsNosql, indexing, replication];

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
