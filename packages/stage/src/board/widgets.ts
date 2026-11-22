import { testCond, type BoardWidget, type Outputs } from "@tintelix/schema";
import { fillOutputs } from "@tintelix/schema/format";
import { esc } from "../render/dom";
import { toBase62 } from "./base62";

type Custom = { html(key: string): string; paint(root: HTMLElement, d: Outputs, clock: number): void };

const pct = (v: number, max: number) => `${Math.round(Math.min(1, Math.max(0, (Number.isFinite(v) ? v : 0) / max)) * 100)}%`;
const group = (n: number) => Math.round(n).toLocaleString("en-US");

/** Widgets a lesson needs that the shared kinds can't draw, by name. */
export const CUSTOM: Record<string, Custom> = {
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
