import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { components, dsaCode, dsaLessons, getDsaLesson, getLesson, getSqlLesson, getSubject, lessonFacts, lessons, sqlLessons, type LessonFacts } from "@tintelix/content";
import { parseListing } from "@tintelix/dsa";
import type { DsaLesson, SqlLesson } from "@tintelix/schema";
import { Icon } from "../../../../ui/Icon";
import { RichText } from "../../../../ui/lesson/StepNarrative";
import { Md } from "../../../../ui/sql/Md";
import "../../../../ui/dsa/dsa.css";

export const dynamicParams = false;

export function generateStaticParams() {
  return [...lessons, ...sqlLessons, ...dsaLessons].map((l) => ({ subject: l.home, slug: l.slug }));
}

type Params = Promise<{ subject: string; slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { subject, slug } = await params;
  const lesson = lessonFacts(subject, slug);
  return lesson ? { title: `${lesson.topic} cheatsheet` } : {};
}

export default async function CheatsheetPage({ params }: { params: Params }) {
  const { subject: subjectId, slug } = await params;
  const sqlLesson = subjectId === "sql" ? getSqlLesson(slug) : undefined;
  const subject = getSubject(subjectId);
  if (sqlLesson && subject) return <SqlCheatsheet lesson={sqlLesson} subject={subject} />;
  const dsaLesson = subjectId === "dsa" ? getDsaLesson(slug) : undefined;
  if (dsaLesson && subject) return <DsaCheatsheet lesson={dsaLesson} subject={subject} />;
  const lesson = getLesson(subjectId, slug);
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

function SheetHead({ subjectId, subjectTitle, slug, lesson }: { subjectId: string; subjectTitle: string; slug: string; lesson: Pick<LessonFacts, "title" | "topic" | "promise"> }) {
  return (
    <>
      <nav className="crumb" aria-label="Breadcrumb">
        <Link href={`/${subjectId}`}>{subjectTitle}</Link>
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
    </>
  );
}

/** A SQL lesson's cheatsheet: the syntax card, the notes and the mistake to avoid. */
function SqlCheatsheet({ lesson, subject }: { lesson: SqlLesson; subject: { id: string; title: string } }) {
  return (
    <main className="page narrow sheet">
      <SheetHead subjectId={subject.id} subjectTitle={subject.title} slug={lesson.slug} lesson={lesson} />
      <div className="sheet-grid">
        <section className="sheet-card sheet-syntax">
          <h2>Syntax</h2>
          <pre>
            <code>{lesson.syntax.code}</code>
          </pre>
        </section>
        {lesson.cheatsheet.map((s) => (
          <section key={s.heading} className="sheet-card">
            <h2>{s.heading}</h2>
            {s.text.map((t, i) => (
              <p key={i}>
                <Md text={t} />
              </p>
            ))}
          </section>
        ))}
        <section className="sheet-card">
          <h2>Watch out</h2>
          <p>
            <Md text={lesson.mistake} />
          </p>
        </section>
      </div>
      <footer className="sheet-foot">
        <p>Every query in this lesson runs against the Tintelix Shop, in a real Postgres in your browser.</p>
        <Link className="btn primary" href={`/${subject.id}/${lesson.slug}`}>
          <Icon name="play" />
          Back to the lesson
        </Link>
      </footer>
    </main>
  );
}

const CARD: [keyof NonNullable<DsaLesson["card"]>, string][] = [
  ["signal", "Signal"],
  ["reachFor", "Reach for"],
  ["askYourself", "Ask yourself"],
  ["whyItWorks", "Why it works"],
  ["trap", "Trap"],
];

/** A DSA lesson's cheatsheet: the pattern card, time and space, the questions to ask, and the code with this problem's lines marked. */
function DsaCheatsheet({ lesson, subject }: { lesson: DsaLesson; subject: { id: string; title: string } }) {
  const code = dsaCode[lesson.slug]!;
  const runs = Object.values(lesson.runs);
  const main = runs.at(-1)!;
  const listing = parseListing(code.listings[main.listing]!.ts, "ts");
  return (
    <main className="page narrow sheet">
      <SheetHead subjectId={subject.id} subjectTitle={subject.title} slug={lesson.slug} lesson={lesson} />
      <div className="sheet-grid">
        {lesson.card && (
          <section className="sheet-card">
            <h2>When to reach for it</h2>
            {CARD.map(([k, label]) => (
              <p key={k}>
                <strong>{label}:</strong> {lesson.card![k]}
              </p>
            ))}
          </section>
        )}
        <section className="sheet-card">
          <h2>Time and space</h2>
          {runs.map((r) => (
            <p key={r.label}>
              <strong>{r.label}:</strong> {r.time} time, {r.space} extra space
            </p>
          ))}
        </section>
        {lesson.ask.length > 0 && (
          <section className="sheet-card">
            <h2>Questions to ask</h2>
            {lesson.ask.map((q) => (
              <p key={q}>{q}</p>
            ))}
          </section>
        )}
        {lesson.cheatsheet.map((s) => (
          <section key={s.heading} className="sheet-card">
            <h2>{s.heading}</h2>
            {s.text.map((t, i) => (
              <p key={i}>
                <RichText text={t} outputs={{}} />
              </p>
            ))}
          </section>
        ))}
        <section className="sheet-card sheet-wide">
          <h2>{main.label}, in TypeScript</h2>
          <pre className="sheet-code" aria-label={listing.changed.length ? "Code; highlighted lines are specific to this problem" : "Code"}>
            {listing.lines.map((line, i) => (
              <div key={i} className={listing.changed.includes(i + 1) ? "chg" : undefined}>
                {line || " "}
              </div>
            ))}
          </pre>
        </section>
      </div>
      <footer className="sheet-foot">
        <p>Practise it on LeetCode from the lesson page, then come back to this sheet before an interview.</p>
        <Link className="btn primary" href={`/${subject.id}/${lesson.slug}`}>
          <Icon name="play" />
          Back to the lesson
        </Link>
      </footer>
    </main>
  );
}
