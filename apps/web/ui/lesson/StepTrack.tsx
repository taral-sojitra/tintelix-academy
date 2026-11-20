import type { Step } from "@tintelix/schema";
import type { IconName } from "@tintelix/stage";
import { Icon } from "../Icon";

const TAG_ICON: Record<Step["tag"], IconName> = { problem: "alert", technique: "wrench", solution: "checkCircle", recap: "list" };

export function StepTrack({ steps, current, onGo }: { steps: Step[]; current: number; onGo: (i: number) => void }) {
  const fill = steps.length > 1 ? (current / (steps.length - 1)) * 100 : 0;
  return (
    <nav className="track" aria-label="Steps in this lesson">
      <div className="track-line" aria-hidden="true">
        <i style={{ width: `${fill}%` }} />
      </div>
      <ol style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
        {steps.map((s, i) => (
          <li key={s.id}>
            <button
              type="button"
              className={`st${i < current ? " done" : ""}${i === current ? " cur" : ""}`}
              aria-current={i === current ? "step" : undefined}
              aria-label={`Step ${i + 1}: ${s.title}`}
              onClick={() => onGo(i)}
            >
              <b>
                <Icon name={i < current ? "check" : TAG_ICON[s.tag]} />
              </b>
              <span>{s.short}</span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
