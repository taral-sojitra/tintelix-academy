import { Fragment } from "react";
import type { Outputs, Step } from "@tintelix/schema";
import { fillOutputs } from "@tintelix/schema/format";
import type { IconName } from "@tintelix/stage";
import { Icon } from "../Icon";

const TAG: Record<Step["tag"], { label: string; icon: IconName }> = {
  problem: { label: "Problem", icon: "alert" },
  technique: { label: "Technique", icon: "wrench" },
  solution: { label: "Solution", icon: "checkCircle" },
  recap: { label: "Recap", icon: "list" },
};

const NOTE: Record<NonNullable<Step["note"]>["kind"], { label: string; icon: IconName }> = {
  watch: { label: "Watch out", icon: "alert" },
  idea: { label: "Key idea", icon: "spark" },
  turn: { label: "Your turn", icon: "target" },
  tip: { label: "Good to know", icon: "bulb" },
  next: { label: "Coming up", icon: "arrowRight" },
};

/** Content text: {outputs} filled in, **bold** as <strong>, everything else as plain text (never HTML). */
export function RichText({ text, outputs }: { text: string; outputs: Outputs }) {
  const parts = fillOutputs(text, outputs).split(/\*\*(.+?)\*\*/g);
  return (
    <>
      {parts.map((p, i) => (i % 2 ? <strong key={i}>{p}</strong> : <Fragment key={i}>{p}</Fragment>))}
    </>
  );
}

export function StepNarrative({ step, index, total, outputs }: { step: Step; index: number; total: number; outputs: Outputs }) {
  const tag = TAG[step.tag];
  return (
    <article className="narr">
      <p className="sr-only" aria-live="polite">
        Step {index + 1} of {total}: {step.title}
      </p>
      <div className="narr-top">
        <span className="eyebrow">
          Step {index + 1} / {total}
        </span>
        <span className={`tag t-${step.tag}`}>
          <Icon name={tag.icon} />
          {tag.label}
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
            <p>
              <RichText text={step.note.text} outputs={outputs} />
            </p>
          </div>
        </aside>
      )}
      {step.changed && step.changed.length > 0 && (
        <div className="changed">
          <span className="eyebrow">What changed</span>
          <ul>
            {step.changed.map((c) => (
              <li key={c.label + c.kind}>
                <em className={`c-${c.kind}`} aria-label={c.kind === "add" ? "Added" : c.kind === "del" ? "Lost" : "Changed"}>
                  {c.kind === "add" ? "+" : c.kind === "del" ? "−" : "~"}
                </em>
                <span>{c.label}</span>
                {c.value && (
                  <span className="mono">
                    <RichText text={c.value} outputs={outputs} />
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}
