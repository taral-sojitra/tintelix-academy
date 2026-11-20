import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { components, getLesson, getSubject, lessons } from "@tintelix/content";
import { Icon } from "../../../../ui/Icon";
import { RichText } from "../../../../ui/lesson/StepNarrative";

export const dynamicParams = false;

export function generateStaticParams() {
  return lessons.map((l) => ({ subject: l.home, slug: l.slug }));
}

type Params = Promise<{ subject: string; slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { subject, slug } = await params;
  const lesson = getLesson(subject, slug);
  return lesson ? { title: `${lesson.topic} cheatsheet` } : {};
}

export default async function CheatsheetPage({ params }: { params: Params }) {
  const { subject: subjectId, slug } = await params;
  const lesson = getLesson(subjectId, slug);
  const subject = getSubject(subjectId);
  if (!lesson || !subject) notFound();
  const outputs = lesson.model.run({ ...lesson.model.defaults, ...lesson.cheatsheetInputs });
  const used = lesson.components.map((id) => components.find((c) => c.id === id)).filter((c) => c !== undefined);
  return (
    <main className="page narrow sheet">
      <nav className="crumb" aria-label="Breadcrumb">
        <Link href={`/${subjectId}`}>{subject.title}</Link>
        <Icon name="arrowRight" />
        <Link href={`/${subjectId}/${slug}`}>{lesson.title}</Link>
        <Icon name="arrowRight" />
        <span>Cheatsheet</span>
      </nav>
      <header className="page-head">
        <p className="eyebrow">Cheatsheet · {lesson.topic}</p>
        <h1>{lesson.title}</h1>
        <p className="lead">{lesson.promise}</p>
      </header>
      <div className="sheet-grid">
        {lesson.cheatsheet.map((s) => (
          <section key={s.heading} className="sheet-card">
            <h2>{s.heading}</h2>
            {s.text.map((t, i) => (
              <p key={i}>
                <RichText text={t} outputs={outputs} />
              </p>
            ))}
          </section>
        ))}
      </div>
      <footer className="sheet-foot">
        <p>
          Building blocks:{" "}
          {used.map((c, i) => (
            <span key={c.id}>
              {i > 0 && ", "}
              <Link href={`/components#${c.id}`}>{c.name}</Link>
            </span>
          ))}
        </p>
        <Link className="btn primary" href={`/${subjectId}/${slug}`}>
          <Icon name="play" />
          Back to the lesson
        </Link>
      </footer>
    </main>
  );
}
