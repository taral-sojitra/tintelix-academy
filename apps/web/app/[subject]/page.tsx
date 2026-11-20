import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSubject, lessonSummaries, subjects } from "@tintelix/content";
import { Icon } from "../../ui/Icon";

export const dynamicParams = false;

export function generateStaticParams() {
  return subjects.map((s) => ({ subject: s.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ subject: string }> }): Promise<Metadata> {
  const s = getSubject((await params).subject);
  return { title: s?.title ?? "Subject" };
}

export default async function SubjectPage({ params }: { params: Promise<{ subject: string }> }) {
  const { subject: id } = await params;
  const subject = getSubject(id);
  if (!subject) notFound();
  const lessons = lessonSummaries(id);
  return (
    <main className="page narrow">
      <nav className="crumb" aria-label="Breadcrumb">
        <Link href="/">Learn</Link> <Icon name="arrowRight" /> <span>{subject.title}</span>
      </nav>
      <header className="page-head">
        <h1>{subject.title}</h1>
        <p className="lead">{subject.blurb}</p>
        {lessons.length > 0 && (
          <p className="meta">
            {lessons.length} lessons in {subject.modules.length} modules · {lessons.filter((l) => l.available).length} open now
          </p>
        )}
      </header>
      {subject.modules.length === 0 ? (
        <div className="empty">
          <h2>Coming in Phase {subject.phase}</h2>
          <p>System Design comes first. This subject follows, using the same lesson player.</p>
          <Link className="btn primary" href="/system-design">
            Go to System Design
          </Link>
        </div>
      ) : (
        subject.modules.map((m, mi) => (
          <section key={m.title} className="module" aria-labelledby={`m-${mi}`}>
            <h2 id={`m-${mi}`}>
              <span className="module-no">{String(mi + 1).padStart(2, "0")}</span> {m.title}
            </h2>
            <ol className="lesson-rows">
              {lessons
                .filter((l) => l.module === m.title)
                .map((l) => (
                  <li key={l.id} className={l.available ? "open" : "soon"}>
                    <span className="lesson-no">{l.order}</span>
                    <div className="lesson-text">
                      {l.available ? <Link href={`/${id}/${l.slug}`}>{l.title ?? l.topic}</Link> : <b>{l.title ?? l.topic}</b>}
                      {l.title && <span className="lesson-topic">{l.topic}</span>}
                      <p>{l.summary}</p>
                    </div>
                    {l.available ? (
                      <Link className="btn primary sm" href={`/${id}/${l.slug}`} aria-label={`Start ${l.title ?? l.topic}`}>
                        Start <Icon name="arrowRight" />
                      </Link>
                    ) : (
                      <span className="badge-soon">Soon</span>
                    )}
                  </li>
                ))}
            </ol>
          </section>
        ))
      )}
    </main>
  );
}
