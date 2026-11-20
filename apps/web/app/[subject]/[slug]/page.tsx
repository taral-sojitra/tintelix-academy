import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLesson, getSubject, lessonSummaries, lessons } from "@tintelix/content";
import { Icon } from "../../../ui/Icon";
import { LessonList } from "../../../ui/lesson/LessonList";
import { LessonPlayer } from "../../../ui/lesson/LessonPlayer";
import "../../../ui/lesson/lesson.css";

export const dynamicParams = false;

export function generateStaticParams() {
  return lessons.map((l) => ({ subject: l.home, slug: l.slug }));
}

type Params = Promise<{ subject: string; slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { subject, slug } = await params;
  const lesson = getLesson(subject, slug);
  return lesson ? { title: `${lesson.title} (${lesson.topic})`, description: lesson.promise } : {};
}

export default async function LessonPage({ params }: { params: Params }) {
  const { subject: subjectId, slug } = await params;
  const lesson = getLesson(subjectId, slug);
  const subject = getSubject(subjectId);
  if (!lesson || !subject) notFound();
  const all = lessonSummaries(subjectId);
  const me = all.find((l) => l.id === lesson.id)!;
  return (
    <div className="lesson-page">
      <LessonList subject={subjectId} title={subject.title} lessons={all} current={lesson.id} />
      <main className="lesson-content">
        <header className="lesson-head">
          <nav className="crumb" aria-label="Breadcrumb">
            <Link href={`/${subjectId}`}>{subject.title}</Link>
            <Icon name="arrowRight" />
            <span>{me.module}</span>
            <Icon name="arrowRight" />
            <span>
              Lesson {me.order} of {all.length} · {lesson.minutes} min
            </span>
          </nav>
          <div className="title-row">
            <span className="topic-tag">{lesson.topic}</span>
            <h1>{lesson.title}</h1>
            <Link className="btn sm sheet-link" href={`/${subjectId}/${slug}/cheatsheet`}>
              <Icon name="sheet" />
              Cheatsheet
            </Link>
          </div>
          <p className="promise">{lesson.promise}</p>
        </header>
        <LessonPlayer key={lesson.id} subject={subjectId} slug={slug} />
      </main>
    </div>
  );
}
