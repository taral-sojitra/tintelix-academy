import Link from "next/link";
import type { LessonSummary } from "@tintelix/content";

/** The subject's lessons by module, with this lesson marked. */
export function LessonList({ subject, title, lessons, current }: { subject: string; title: string; lessons: LessonSummary[]; current: string }) {
  const modules = [...new Set(lessons.map((l) => l.module))];
  return (
    <aside className="side" aria-label={`${title} lessons`}>
      <Link href={`/${subject}`} className="side-head">
        <b>{title}</b>
        <span>
          {lessons.filter((l) => l.available).length} of {lessons.length} open
        </span>
      </Link>
      {modules.map((m) => (
        <section key={m}>
          <h3>{m}</h3>
          <ul>
            {lessons
              .filter((l) => l.module === m)
              .map((l) => (
                <li key={l.id} className={`${l.id === current ? "cur" : ""}${l.available ? "" : " soon"}`}>
                  <span className="dot" aria-hidden="true" />
                  {l.available ? (
                    <Link href={l.href} aria-current={l.id === current ? "page" : undefined}>
                      {l.title ?? l.topic}
                      {l.title && <small>{l.topic}</small>}
                    </Link>
                  ) : (
                    <span>
                      {l.title ?? l.topic}
                      {l.title && <small>{l.topic}</small>}
                    </span>
                  )}
                </li>
              ))}
          </ul>
        </section>
      ))}
      <p className="side-note">Progress is saved in this browser.</p>
    </aside>
  );
}
