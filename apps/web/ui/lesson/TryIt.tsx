import type { Control, Outputs } from "@tintelix/schema";
import { formatOutput } from "@tintelix/schema/format";
import { Icon } from "../Icon";
import { RichText } from "./StepNarrative";

const OWN_UNIT = ["Pct", "Ms", "Sec", "Avail", "Downtime", "Price"];

/** One control from the lesson, unlocked only on the steps that allow it. */
export function TryIt({ name, control, value, enabled, lockedText, outputs, onChange, onReset, changed }: {
  name: string;
  control: Control;
  value: number;
  enabled: boolean;
  lockedText: string;
  outputs: Outputs;
  onChange: (v: number) => void;
  onReset: () => void;
  changed: boolean;
}) {
  // A *Pct control already holds a percentage (30 is 30%); a fraction with a % unit (a 0.8 hit rate)
  // is shown and dragged in whole percents.
  const pct = control.unit === "%" && !name.endsWith("Pct");
  const shown = pct ? Math.round(value * 100) : value;
  // Names that format with their own unit ("30%", "50 ms", "60 min") read the way the model's numbers
  // do; other values are grouped, then the unit.
  const ownUnit = OWN_UNIT.some((suffix) => name.endsWith(suffix));
  const text = pct ? `${shown}%` : ownUnit ? formatOutput(name, value) : `${formatOutput(name, value)}${control.unit ? ` ${control.unit}` : ""}`;
  const id = `ctl-${name}`;
  return (
    <section className={`try${enabled ? "" : " off"}`} aria-labelledby={`${id}-label`}>
      <div className="try-head">
        <label id={`${id}-label`} htmlFor={id}>
          <Icon name="target" />
          Try it: {control.label.charAt(0).toLowerCase() + control.label.slice(1)}
        </label>
        <span className="try-val">{enabled ? text : "—"}</span>
      </div>
      <input
        id={id}
        type="range"
        min={pct ? control.min * 100 : control.min}
        max={pct ? control.max * 100 : control.max}
        step={pct ? (control.step ?? 0.01) * 100 : control.step ?? 1}
        value={shown}
        disabled={!enabled}
        aria-valuetext={pct ? `${shown} percent` : text}
        onChange={(e) => onChange(pct ? Number(e.target.value) / 100 : Number(e.target.value))}
      />
      <p className="try-readout">{enabled && control.readout ? <RichText text={control.readout} outputs={outputs} /> : lockedText}</p>
      {enabled && changed && (
        <button type="button" className="btn ghost sm try-reset" onClick={onReset}>
          <Icon name="replay" />
          Back to the step's value
        </button>
      )}
    </section>
  );
}
