import Link from "next/link";
import type { LessonSummary } from "@tintelix/content";
import type { Subject } from "@tintelix/schema";
import type { IconName } from "@tintelix/stage";
import { Icon } from "./Icon";

const LOOK: Record<Subject["id"], { icon: IconName; tag: string }> = {
  "system-design": { icon: "lab", tag: "System diagrams" },
  networks: { icon: "lb", tag: "Packet journeys" },
  apis: { icon: "shuffle", tag: "Request & response" },
  linux: { icon: "server", tag: "Practice shell" },
  microservices: { icon: "blocks", tag: "System diagrams" },
  sql: { icon: "db", tag: "Live tables" },
  dsa: { icon: "activity", tag: "Algorithm traces" },
};

export function SubjectCard({ subject, lessons }: { subject: Subject; lessons: LessonSummary[] }) {
  const look = LOOK[subject.id];
  const open = lessons.filter((l) => l.available);
  const preview = [...open, ...lessons.filter((l) => !l.available && l.title)].slice(0, 3);
  const live = open.length > 0;
  return (
    <article className={`subject s-${subject.id}${live ? " live" : ""}`}>
      <header>
        <span className="subject-icon">
          <Icon name={look.icon} />
        </span>
        <span className="subject-tag">{look.tag}</span>
      </header>
      <h3>
        {live ? <Link href={`/${subject.id}`}>{subject.title}</Link> : subject.title}
        {lessons.length > 0 && <small>{lessons.length} lessons</small>}
      </h3>
      {preview.length > 0 ? (
        <ul className="subject-lessons">
          {preview.map((l) => (
            <li key={l.id} className={l.available ? "open" : ""}>
              {l.available ? <Link href={`/${subject.id}/${l.slug}`}>{l.title ?? l.topic}</Link> : <span>{l.title ?? l.topic}</span>}
              <small>
                {l.topic}
                {!l.available && " · soon"}
              </small>
            </li>
          ))}
        </ul>
      ) : (
        <p className="subject-blurb">{subject.blurb}</p>
      )}
      <footer>
        {live ? (
          <Link className="link-arrow" href={`/${subject.id}`}>
            {open.length} of {lessons.length} open <Icon name="arrowRight" />
          </Link>
        ) : (
          <span className="phase">Coming in Phase {subject.phase}</span>
        )}
      </footer>
    </article>
  );
}
