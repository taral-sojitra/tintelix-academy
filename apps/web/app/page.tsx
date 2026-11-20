import Link from "next/link";
import { components, getLesson, lessonSummaries, subjects } from "@tintelix/content";
import { ContinueCard, type ContinueTarget } from "../ui/ContinueCard";
import { Icon } from "../ui/Icon";
import { SubjectCard } from "../ui/SubjectCard";

export default function Home() {
  const targets: ContinueTarget[] = subjects.flatMap((s) => {
    const all = lessonSummaries(s.id);
    return all
      .filter((l) => l.available)
      .map((l) => {
        const lesson = getLesson(s.id, l.slug)!;
        return { id: l.id, href: `/${s.id}/${l.slug}`, title: lesson.title, topic: lesson.topic, subject: s.title, order: l.order, total: all.length, steps: lesson.steps.length, minutes: lesson.minutes };
      });
  });
  return (
    <main className="page">
      <ContinueCard lessons={targets} />
      <section className="subjects" aria-labelledby="subjects-title">
        <div className="section-head">
          <div>
            <h2 id="subjects-title">Subjects</h2>
            <p>One way of learning across all seven: watch it move, change it yourself, keep the numbers.</p>
          </div>
        </div>
        <div className="subject-grid">
          {subjects.map((s) => (
            <SubjectCard key={s.id} subject={s} lessons={lessonSummaries(s.id)} />
          ))}
          <article className="subject comps">
            <div className="comp-icons" aria-hidden="true">
              {(["users", "lb", "server", "bolt", "db"] as const).map((i) => (
                <span key={i}>
                  <Icon name={i} />
                </span>
              ))}
            </div>
            <h3>Components</h3>
            <p className="subject-blurb">Every building block you meet in a lesson gets one card: what it does, when to use it, numbers to remember.</p>
            <footer>
              <Link className="btn" href="/components">
                <Icon name="blocks" />
                Browse {components.length} components
              </Link>
            </footer>
          </article>
        </div>
      </section>
    </main>
  );
}
