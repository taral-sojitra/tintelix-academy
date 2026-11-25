import type { DsaPredict } from "@tintelix/schema";
import { Icon } from "../Icon";

/** Asks before the move plays. Until the learner picks, playback and Next stay locked. */
export function PredictCard({ predict, chosen, open, onPick }: { predict: DsaPredict; chosen: number | undefined; open: boolean; onPick: (i: number) => void }) {
  if (chosen === undefined && !open) return null;
  const right = chosen === predict.answer;
  return (
    <section className={`dsa-predict${chosen === undefined ? " ask" : right ? " right" : " wrong"}`} aria-live="polite">
      <span className="eyebrow">
        <Icon name="target" />
        Predict the next move
      </span>
      <p className="q">{predict.ask}</p>
      <div className="opts">
        {predict.options.map((o, i) => (
          <button
            key={o}
            type="button"
            className={`btn sm${chosen !== undefined && i === predict.answer ? " ans" : ""}${chosen === i && !right ? " miss" : ""}`}
            disabled={chosen !== undefined}
            onClick={() => onPick(i)}
          >
            {o}
          </button>
        ))}
      </div>
      {chosen !== undefined && <p className="verdict">{right ? `Right: ${predict.options[predict.answer]}.` : `Not quite: it's ${predict.options[predict.answer]}. Watch it play.`}</p>}
    </section>
  );
}
