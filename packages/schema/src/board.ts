import { z } from "zod";
import type { Outputs } from "./model";

/** Packet colours a board can use. */
const Hue = z.enum(["cyan", "green", "amber", "violet", "red"]);

/** A test on one model output: above and/or below a value. */
export const Cond = z.object({ output: z.string(), above: z.number().optional(), below: z.number().optional() });
export type Cond = z.infer<typeof Cond>;

/** True when the output exists and passes every bound given. */
export function testCond(c: Cond, outputs: Outputs): boolean {
  const v = outputs[c.output];
  if (v === undefined || Number.isNaN(v)) return false;
  if (c.above !== undefined && !(v > c.above)) return false;
  if (c.below !== undefined && !(v < c.below)) return false;
  return true;
}

/** One kind of request: the wires it travels, the node each wire reaches, and how it ends. */
export const BoardFlow = z.object({
  path: z.array(z.object({ wire: z.string(), dir: z.union([z.literal(1), z.literal(-1)]), at: z.string() })).min(1),
  color: Hue,
  /** Colour on the way back to the start; without it the request stops at its last node. */
  back: Hue.optional(),
  small: z.boolean().optional(),
  /** Where some of these requests fail, and the …Pct output (0–100) that says how many. */
  fail: z.object({ at: z.string(), share: z.string() }).optional(),
  /** A floating label when a request reaches a node, on a share (0–1) of arrivals. */
  float: z.object({ at: z.string(), text: z.string(), color: Hue, chance: z.number().min(0).max(1) }).optional(),
});
export type BoardFlow = z.infer<typeof BoardFlow>;

export const BoardTile = z.object({
  id: z.string(),
  label: z.string(),
  icon: z.string(),
  hue: z.enum(["cyan", "green", "violet", "blue", "amber"]),
  /** Templates with {output} placeholders. */
  value: z.string(),
  note: z.string(),
  mood: z.enum(["good", "bad", ""]).optional(),
  /** Overrides `mood` while the condition holds. */
  moodIf: Cond.extend({ mood: z.enum(["good", "bad"]) }).optional(),
});
export type BoardTile = z.infer<typeof BoardTile>;

/** Small pictures inside a node, drawn from model outputs. */
export const BoardWidget = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("text"), text: z.string(), when: Cond.optional() }),
  z.object({ kind: z.literal("meter"), output: z.string(), max: z.number().positive(), text: z.string().optional() }),
  z.object({ kind: z.literal("cells"), output: z.string(), total: z.number().int().positive(), cols: z.number().int().positive().optional() }),
  z.object({ kind: z.literal("bars"), rows: z.array(z.object({ label: z.string(), output: z.string(), max: z.number().positive() })).min(1) }),
  z.object({ kind: z.literal("chips"), items: z.array(z.string()).min(1) }),
  z.object({ kind: z.literal("log"), lines: z.array(z.object({ text: z.string(), when: Cond.optional() })).min(1) }),
  z.object({ kind: z.literal("custom"), name: z.string() }),
]);
export type BoardWidget = z.infer<typeof BoardWidget>;

/** What runs in one mode: which flows, in what proportions (a number or an output's name), and the tiles. */
export const BoardMode = z.object({
  flows: z.array(z.object({ flow: z.string(), weight: z.union([z.number(), z.string()]) })),
  rate: z.number().positive().optional(),
  tiles: z.array(BoardTile),
});
export type BoardMode = z.infer<typeof BoardMode>;

/**
 * A case study's design board: requests flowing through boxes, set up as data. The model's `mode`
 * output picks the mode (clamped to the last one).
 */
export const Board = z.object({
  legend: z.array(z.tuple([z.string(), z.string()])),
  chart: z.object({ label: z.string(), output: z.string(), max: z.number().positive(), danger: z.number() }).optional(),
  flows: z.record(z.string(), BoardFlow),
  modes: z.array(BoardMode).min(1),
  widgets: z.record(z.string(), z.array(BoardWidget)).optional(),
  /** A class on a node while a condition holds, such as tx-down when the database is overloaded. */
  states: z
    .array(z.object({ node: z.string(), cls: z.enum(["tx-down", "tx-hot", "tx-stale", "tx-lead", "tx-cand"]), when: Cond }))
    .optional(),
  /** Node subtitles that follow the model: templates with {output} placeholders. */
  subs: z.record(z.string(), z.string()).optional(),
});
export type Board = z.infer<typeof Board>;

/** Every template string on a board, for checking what it quotes. */
export function boardTexts(b: Board, mode: number): string[] {
  const m = b.modes[mode];
  const widgetTexts = Object.values(b.widgets ?? {}).flatMap((ws) =>
    ws.flatMap((w) => {
      if (w.kind === "text") return [w.text];
      if (w.kind === "meter") return [w.text ?? ""];
      if (w.kind === "chips") return w.items;
      if (w.kind === "log") return w.lines.map((l) => l.text);
      return [];
    }),
  );
  return [
    ...(m?.tiles ?? []).flatMap((t) => [t.value, t.note]),
    ...widgetTexts,
    ...Object.values(b.subs ?? {}),
    ...Object.values(b.flows).map((f) => f.float?.text ?? ""),
  ];
}

/** Every output a board reads directly (not through templates). */
export function boardOutputs(b: Board): string[] {
  const out: string[] = [];
  for (const f of Object.values(b.flows)) if (f.fail) out.push(f.fail.share);
  for (const m of b.modes) for (const f of m.flows) if (typeof f.weight === "string") out.push(f.weight);
  for (const ws of Object.values(b.widgets ?? {}))
    for (const w of ws) {
      if (w.kind === "meter" || w.kind === "cells") out.push(w.output);
      if (w.kind === "bars") out.push(...w.rows.map((r) => r.output));
      if (w.kind === "text" && w.when) out.push(w.when.output);
      if (w.kind === "log") for (const l of w.lines) if (l.when) out.push(l.when.output);
    }
  for (const s of b.states ?? []) out.push(s.when.output);
  for (const m of b.modes) for (const t of m.tiles) if (t.moodIf) out.push(t.moodIf.output);
  if (b.chart) out.push(b.chart.output);
  return out;
}
