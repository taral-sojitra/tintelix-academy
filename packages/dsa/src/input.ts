import type { Field, InputSpec } from "@tintelix/schema";

export type Parsed = { ok: true; value: Record<string, unknown> } | { ok: false; errors: Record<string, string> };

/** Minus sign for display, so −99 reads as a negative number and not a dash. */
const num = (n: number) => (n < 0 ? `−${-n}` : String(n));
const WHOLE = /^-?\d+$/;

/** Checks one field's value; returns the plain-words problem, or null. */
function problem(field: Field, value: unknown): string | null {
  if (field.kind === "int") {
    if (typeof value !== "number" || !Number.isInteger(value)) return "Give a whole number.";
    return value < field.min || value > field.max ? `Keep it between ${num(field.min)} and ${num(field.max)}.` : null;
  }
  if (!Array.isArray(value) || value.some((v) => typeof v !== "number" || !Number.isInteger(v))) return "Give whole numbers.";
  const xs = value as number[];
  const [least, most] = field.length;
  if (xs.length > most) return `Keep it to ${most} numbers so every cell fits.`;
  if (xs.length < least) return `Give at least ${least} number${least === 1 ? "" : "s"}.`;
  const out = xs.find((x) => x < field.min || x > field.max);
  if (out !== undefined) return `Keep each number between ${num(field.min)} and ${num(field.max)}: ${num(out)} is outside.`;
  if (field.sorted) {
    const i = xs.findIndex((x, k) => k > 0 && x < xs[k - 1]!);
    if (i > 0) return `The numbers need to be sorted: ${num(xs[i - 1]!)} comes before ${num(xs[i]!)}.`;
  }
  if (field.distinct) {
    const twice = xs.find((x, k) => xs.indexOf(x) !== k);
    if (twice !== undefined) return `Each number can appear once: ${num(twice)} is there twice.`;
  }
  return null;
}

/** Reads the custom input form. Nothing runs until every field reads cleanly. */
export function parseInput(spec: InputSpec, raw: Record<string, string>): Parsed {
  const value: Record<string, unknown> = {};
  const errors: Record<string, string> = {};
  for (const [name, field] of Object.entries(spec)) {
    const text = (raw[name] ?? "").trim();
    if (field.kind === "int") {
      if (!WHOLE.test(text)) {
        errors[name] = text ? `“${text}” isn't a whole number.` : "Give a whole number.";
        continue;
      }
      value[name] = Number(text);
    } else {
      const parts = text ? text.split(/[\s,]+/).filter(Boolean) : [];
      const bad = parts.find((p) => !WHOLE.test(p));
      if (bad !== undefined) {
        errors[name] = `“${bad}” isn't a whole number.`;
        continue;
      }
      value[name] = parts.map(Number);
    }
    const p = problem(field, value[name]);
    if (p) errors[name] = p;
  }
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value };
}

/** The form's text for a value, so a preset can open in the custom input form. */
export function formatInput(spec: InputSpec, value: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(Object.entries(spec).map(([name, f]) => [name, f.kind === "ints" ? ((value[name] as number[]) ?? []).join(", ") : String(value[name] ?? "")]));
}

/** The input's fields as arguments, in the order the spec lists them. */
export function argsFor(spec: InputSpec, value: Record<string, unknown>): unknown[] {
  return Object.keys(spec).map((name) => value[name]);
}

/** A preset's problems against the spec, as "field: message". */
export function checkValue(spec: InputSpec, value: Record<string, unknown>): string[] {
  const out: string[] = [];
  for (const [name, field] of Object.entries(spec)) {
    if (!(name in value)) out.push(`${name}: missing`);
    else {
      const p = problem(field, value[name]);
      if (p) out.push(`${name}: ${p}`);
    }
  }
  return out;
}
