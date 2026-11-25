"use client";

import { useState } from "react";
import { formatInput, parseInput } from "@tintelix/dsa";
import type { DsaPreset, InputSpec } from "@tintelix/schema";

/** Preset chips and a custom input form. Nothing runs until every field reads cleanly. */
export function InputPanel({
  presets,
  spec,
  active,
  onPreset,
  onCustom,
}: {
  presets: DsaPreset[];
  spec: InputSpec;
  active: string | null;
  onPreset: (p: DsaPreset) => void;
  onCustom: (value: Record<string, unknown>) => void;
}) {
  const [raw, setRaw] = useState(() => formatInput(spec, presets[0]!.input));
  const [errors, setErrors] = useState<Record<string, string>>({});
  return (
    <section className="dsa-input" aria-labelledby="dsa-input-h">
      <h3 id="dsa-input-h">Try other inputs</h3>
      <ul className="chips">
        {presets.map((p) => (
          <li key={p.id}>
            <button type="button" className={`chip${active === p.id ? " on" : ""}`} aria-pressed={active === p.id} onClick={() => {
                onPreset(p);
                setRaw(formatInput(spec, p.input));
                setErrors({});
              }}>
              {p.label}
            </button>
          </li>
        ))}
      </ul>
      <form
        className="dsa-form"
        onSubmit={(e) => {
          e.preventDefault();
          const r = parseInput(spec, raw);
          if (r.ok) {
            setErrors({});
            onCustom(r.value);
          } else setErrors(r.errors);
        }}
      >
        {Object.entries(spec).map(([name, f]) => (
          <label key={name} className={errors[name] ? "bad" : undefined}>
            <span>{f.label}</span>
            <input
              name={name}
              value={raw[name] ?? ""}
              inputMode={f.kind === "int" ? "numeric" : "text"}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              aria-invalid={!!errors[name]}
              aria-describedby={errors[name] ? `err-${name}` : undefined}
              onChange={(e) => setRaw({ ...raw, [name]: e.target.value })}
            />
            {errors[name] && (
              <small id={`err-${name}`} role="alert">
                {errors[name]}
              </small>
            )}
          </label>
        ))}
        <button type="submit" className="btn sm primary">
          Run it
        </button>
      </form>
    </section>
  );
}
