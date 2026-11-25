import type { DsaStep } from "@tintelix/schema";
import type { IconName } from "@tintelix/stage";
import { Icon } from "../Icon";
import { RichText } from "../lesson/StepNarrative";

/** Each lesson part as a label, an icon and the existing tag colour it borrows. */
export const PART: Record<DsaStep["part"], { label: string; icon: IconName; tone: string }> = {
  method: { label: "Method", icon: "list", tone: "technique" },
  problem: { label: "Problem", icon: "alert", tone: "problem" },
  slow: { label: "The slow way", icon: "hourglass", tone: "problem" },
  pattern: { label: "The pattern", icon: "spark", tone: "solution" },
  spot: { label: "When to use it", icon: "target", tone: "technique" },
  breaks: { label: "Where it breaks", icon: "alert", tone: "problem" },
  practice: { label: "Practice", icon: "practice", tone: "solution" },
  recap: { label: "Recap", icon: "check", tone: "recap" },
};

const NOTE: Record<NonNullable<DsaStep["note"]>["kind"], { label: string; icon: IconName }> = {
  watch: { label: "Watch out", icon: "alert" },
  idea: { label: "Key idea", icon: "spark" },
  turn: { label: "Your turn", icon: "target" },
  tip: { label: "Good to know", icon: "bulb" },
  next: { label: "Coming up", icon: "arrowRight" },
};

export function DsaNarrative({ step, index, total, outputs }: { step: DsaStep; index: number; total: number; outputs: Record<string, number> }) {
  const part = PART[step.part];
  return (
    <article className="narr">
      <p className="sr-only" aria-live="polite">
        Step {index + 1} of {total}: {step.title}
      </p>
      <div className="narr-top">
        <span className="eyebrow">
          Step {index + 1} / {total}
        </span>
        <span className={`tag t-${part.tone}`}>
          <Icon name={part.icon} />
          {part.label}
        </span>
      </div>
      <h2>{step.title}</h2>
      <div className="narr-body">
        {step.text.map((t, i) => (
          <p key={i}>
            <RichText text={t} outputs={outputs} />
          </p>
        ))}
      </div>
      {step.note && (
        <aside className={`note n-${step.note.kind}`}>
          <Icon name={NOTE[step.note.kind].icon} />
          <div>
            <span className="eyebrow">{NOTE[step.note.kind].label}</span>
            <p>{step.note.text}</p>
          </div>
        </aside>
      )}
    </article>
  );
}

export function DsaTrack({ steps, current, onGo }: { steps: DsaStep[]; current: number; onGo: (i: number) => void }) {
  const fill = steps.length > 1 ? (current / (steps.length - 1)) * 100 : 0;
  return (
    <nav className="track" aria-label="Steps in this lesson">
      <div className="track-line" aria-hidden="true">
        <i style={{ width: `${fill}%` }} />
      </div>
      <ol style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
        {steps.map((s, i) => (
          <li key={s.id}>
            <button type="button" className={`st${i < current ? " done" : ""}${i === current ? " cur" : ""}`} aria-current={i === current ? "step" : undefined} aria-label={`Step ${i + 1}: ${s.title}`} onClick={() => onGo(i)}>
              <b>
                <Icon name={i < current ? "check" : PART[s.part].icon} />
              </b>
              <span>{s.short}</span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
