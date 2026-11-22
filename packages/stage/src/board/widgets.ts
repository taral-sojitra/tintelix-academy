import { testCond, type BoardWidget, type Outputs } from "@tintelix/schema";
import { fillOutputs } from "@tintelix/schema/format";
import { esc } from "../render/dom";
import { toBase62 } from "./base62";

type Custom = { html(key: string): string; paint(root: HTMLElement, d: Outputs, clock: number): void };

const pct = (v: number, max: number) => `${Math.round(Math.min(1, Math.max(0, (Number.isFinite(v) ? v : 0) / max)) * 100)}%`;
const group = (n: number) => Math.round(n).toLocaleString("en-US");

/** The seven steps of a design interview and the minutes each gets out of 45. */
const STEPS: [string, number][] = [["requirements", 5], ["estimates", 5], ["API", 5], ["data", 5], ["design", 10], ["deep dive", 10], ["bottlenecks", 5]];

/** Widgets a lesson needs that the shared kinds can't draw, by name. */
export const CUSTOM: Record<string, Custom> = {
  /** A 64-bit ID drawn as its parts (sign, time, machine, sequence) and the number they make. */
  bitlayout: {
    html: (key) =>
      `<div class="tx-idbits" data-w="${key}"><div class="tx-idbits-bar"><span class="b-sign"><i></i><em></em></span><span class="b-time"><i></i><em data-bl="time"></em></span><span class="b-machine"><i></i><em data-bl="machine"></em></span><span class="b-seq"><i></i><em data-bl="seq"></em></span></div><p class="tx-calc-s" data-bits-vals></p><p class="tx-b62-id" data-bits-id></p></div>`,
    paint(root, d, clock) {
      const mb = Math.round(d.machineBits ?? 10);
      const sb = Math.round(d.seqBits ?? 22 - mb);
      const bar = root.querySelector<HTMLElement>(".tx-idbits-bar")!;
      const cols = `1fr 41fr ${mb}fr ${sb}fr`;
      if (bar.style.gridTemplateColumns !== cols) bar.style.gridTemplateColumns = cols;
      root.querySelector("[data-bl='time']")!.textContent = "time · 41 bits";
      root.querySelector("[data-bl='machine']")!.textContent = "machine";
      root.querySelector("[data-bl='seq']")!.textContent = "seq";
      const machine = Math.round(d.sampleMachine ?? 0);
      const vals = root.querySelector("[data-bits-vals]")!;
      const idEl = root.querySelector("[data-bits-id]")!;
      if (machine >= 2 ** mb) {
        vals.textContent = `machine ${machine} doesn't fit in ${mb} bits`;
        idEl.textContent = "no valid ID";
        return;
      }
      const t = Math.round(d.sampleMs ?? 0) + Math.floor(Math.max(0, clock) * 1000);
      const perMs = Math.max(1, Math.round((d.perServerRate ?? 1000) / 1000));
      const seq = Math.floor(Math.max(0, clock) * (d.perServerRate ?? 0)) % perMs;
      const id = (BigInt(t) << BigInt(mb + sb)) | (BigInt(machine) << BigInt(sb)) | BigInt(seq);
      vals.textContent = `time ${group(t)} ms · machine ${machine} · sequence ${seq}`;
      idEl.textContent = `ID ${id.toLocaleString("en-US")}`;
    },
  },
  /** A 45-minute bar split into the seven steps, marking the step (or steps) this part of the lesson covers. */
  stepclock: {
    html: (key) =>
      `<div class="tx-sclock" data-w="${key}"><div class="tx-sclock-bar" style="grid-template-columns:${STEPS.map(([, m]) => `${m}fr`).join(" ")}">${STEPS.map(([name], i) => `<span data-seg="${i + 1}"><i></i><em>${esc(name)}</em></span>`).join("")}</div><p class="tx-calc-s"></p></div>`,
    paint(root, d) {
      const from = Math.round(d.phase ?? 1);
      const to = Math.max(from, Math.round(d.phaseEnd ?? 0));
      root.querySelectorAll<HTMLElement>("[data-seg]").forEach((seg) => {
        const i = Number(seg.dataset.seg);
        seg.classList.toggle("done", i < from || from > STEPS.length);
        seg.classList.toggle("now", i >= from && i <= to && from <= STEPS.length);
      });
      let text = "45 minutes: all seven steps done";
      if (from <= STEPS.length) {
        const start = STEPS.slice(0, from - 1).reduce((a, [, m]) => a + m, 0);
        const span = STEPS.slice(from - 1, to);
        const end = start + span.reduce((a, [, m]) => a + m, 0);
        text = `Minutes ${start}–${end}: ${span.map(([n]) => n).join(", ")}`;
      }
      root.querySelector(".tx-calc-s")!.textContent = text;
    },
  },
  /** The id counter behind short codes: the next id and the code it becomes. */
  base62: {
    html: (key) => `<div class="tx-b62" data-w="${key}"><p class="tx-b62-id"></p><p class="tx-calc-s"></p></div>`,
    paint(root, d, clock) {
      const len = Math.max(1, Math.round(d.codeLength ?? 7));
      const id = Math.floor((d.idStart ?? 0) + Math.max(0, clock) * (d.writeRate ?? 0));
      const code = toBase62(id, len);
      const fits = code.length <= len;
      root.querySelector(".tx-b62-id")!.textContent = `#${group(id)} → ${fits ? code : `needs ${code.length} characters`}`;
      root.querySelector(".tx-calc-s")!.textContent = fits ? `${len} characters` : `${len} characters: out of codes`;
    },
  },
};

/** The markup for one widget; its root carries data-w="<key>". */
export function widgetHtml(w: BoardWidget, key: string): string {
  const k = `data-w="${key}"`;
  switch (w.kind) {
    case "text":
      return `<p class="tx-calc-s" ${k}></p>`;
    case "meter":
      return `<div ${k}><div class="tx-meter"><i></i></div>${w.text ? `<p class="tx-calc-s"></p>` : ""}</div>`;
    case "cells":
      return `<div class="tx-cells" ${k} style="grid-template-columns:repeat(${w.cols ?? 10},1fr)">${"<i></i>".repeat(w.total)}</div>`;
    case "bars":
      return `<div class="tx-budget" ${k}>${w.rows.map((r) => `<div class="tx-brow"><em>${esc(r.label)}</em><div class="tx-btrack"><i class="b-client"></i></div></div>`).join("")}</div>`;
    case "chips":
      return `<div class="tx-chips" ${k}>${w.items.map(() => `<span class="on"></span>`).join("")}</div>`;
    case "log":
      return `<ul class="tx-log" ${k}>${w.lines.map(() => "<li></li>").join("")}</ul>`;
    case "custom":
      return CUSTOM[w.name]?.html(key) ?? `<div ${k}></div>`;
  }
}

/** Draws one widget from the model's outputs; `clock` is seconds since the step began. */
export function paintWidget(root: HTMLElement, w: BoardWidget, d: Outputs, clock: number): void {
  switch (w.kind) {
    case "text":
      root.hidden = w.when ? !testCond(w.when, d) : false;
      root.textContent = fillOutputs(w.text, d);
      return;
    case "meter": {
      root.querySelector<HTMLElement>(".tx-meter i")!.style.width = pct(d[w.output] ?? 0, w.max);
      const p = root.querySelector(".tx-calc-s");
      if (p && w.text) p.textContent = fillOutputs(w.text, d);
      return;
    }
    case "cells": {
      const lit = Math.round(Math.min(w.total, Math.max(0, d[w.output] ?? 0)));
      root.querySelectorAll("i").forEach((c, i) => c.classList.toggle("on", i < lit));
      return;
    }
    case "bars":
      root.querySelectorAll<HTMLElement>(".tx-btrack i").forEach((bar, i) => {
        const row = w.rows[i]!;
        bar.style.width = pct(d[row.output] ?? 0, row.max);
      });
      return;
    case "chips":
      root.querySelectorAll("span").forEach((s, i) => (s.textContent = fillOutputs(w.items[i]!, d)));
      return;
    case "log":
      root.querySelectorAll<HTMLElement>("li").forEach((li, i) => {
        const line = w.lines[i]!;
        li.hidden = line.when ? !testCond(line.when, d) : false;
        li.textContent = fillOutputs(line.text, d);
      });
      return;
    case "custom":
      CUSTOM[w.name]?.paint(root, d, clock);
      return;
  }
}
