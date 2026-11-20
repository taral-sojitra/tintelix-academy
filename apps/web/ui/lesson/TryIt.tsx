import type { Control, Outputs } from "@tintelix/schema";
import { formatOutput } from "@tintelix/schema/format";
import { Icon } from "../Icon";
import { RichText } from "./StepNarrative";

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
  const pct = control.unit === "%";
  const shown = pct ? Math.round(value * 100) : value;
  // Durations read the way the model's numbers do ("60 s", "60 min"); other values are grouped, then the unit.
  const text = pct ? `${shown}%` : name.endsWith("Sec") ? formatOutput(name, value) : `${formatOutput(name, value)}${control.unit ? ` ${control.unit}` : ""}`;
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
