import type { SceneNode, SceneSpec } from "@tintelix/schema";
import { makeWire } from "../geometry";
import { iconSvg, type IconName } from "../icons";
import type { Tile } from "../scenes/types";

const KIND_ICON: Record<SceneNode["kind"], IconName> = { users: "users", lb: "lb", app: "server", cache: "bolt", db: "db", edge: "edge", origin: "origin", services: "stack", histogram: "bars", curve: "activity" };

/** Escapes text for HTML. Every content string that reaches the stage goes through this. */
export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** The coloured icon square for a node kind. */
export function kindTile(kind: SceneNode["kind"], small = false): string {
  return `<span class="tx-tile k-${kind}${small ? " sm" : ""}">${iconSvg(KIND_ICON[kind], "")}</span>`;
}

/** A node's header: icon, label (with an optional badge) and sub-label. */
export function nodeHead(n: SceneNode, opts: { badge?: string } = {}): string {
  const badge = opts.badge ? ` <span class="tx-badge" data-new>${esc(opts.badge)}</span>` : "";
  return `<div class="tx-nh">${kindTile(n.kind)}<div><b>${esc(n.label)}${badge}</b><span class="tx-sub">${esc(n.sub)}</span></div></div>`;
}

export interface StageOptions {
  /** Colour key and text for each entry in the legend. */
  legend: [string, string][];
  /** Text above the chart, such as "DB LOAD · LAST 30 S". */
  chartLabel: string;
  /** The inside of each node box; the scene owns its widgets. */
  nodeBody: (id: string, node: SceneNode) => string;
}

export interface StageDom {
  root: HTMLElement;
  world: HTMLElement;
  back: HTMLCanvasElement;
  front: HTMLCanvasElement;
  chart: HTMLCanvasElement;
  chartValue: HTMLElement;
  tagText: HTMLElement;
  /** On a narrow stage: switches between a readable zoom and the whole diagram. */
  zoom: HTMLButtonElement;
  nodes: Record<string, HTMLElement>;
}

/** Builds the stage: back canvas, HTML boxes, front canvas and the overlays. */
export function buildStage(host: HTMLElement, scene: SceneSpec, opts: StageOptions): StageDom {
  host.innerHTML = `<div class="tx-stage">
    <canvas class="tx-back" aria-hidden="true"></canvas>
    <div class="tx-world" style="width:${scene.world.w}px;height:${scene.world.h}px"></div>
    <canvas class="tx-front" aria-hidden="true"></canvas>
    <div class="tx-ov tx-tagline"><span class="tx-live"></span><span class="tx-tagtext"></span></div>
    <div class="tx-ov tx-legend" aria-hidden="true">${opts.legend.map(([c, l]) => `<span><i style="background:var(--${esc(c)})"></i>${esc(l)}</span>`).join("")}</div>
    <div class="tx-ov tx-chartbox" aria-hidden="true"><div class="tx-ch"><span>${esc(opts.chartLabel)}</span><b class="tx-chartv"></b></div><canvas class="tx-chart"></canvas></div>
    <button type="button" class="tx-ov tx-zoom">Whole diagram</button>
    <div class="tx-ov tx-panhint" aria-hidden="true">drag ↔</div>
  </div>`;
  const root = host.querySelector<HTMLElement>(".tx-stage")!;
  const world = root.querySelector<HTMLElement>(".tx-world")!;
  // Behind everything else in the world: labelled regions, then labels on long wires.
  for (const r of scene.regions ?? []) {
    const el = document.createElement("div");
    el.className = "tx-region";
    el.dataset.region = r.id;
    Object.assign(el.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px` });
    el.innerHTML = `<span>${esc(r.label)}</span>`;
    world.appendChild(el);
  }
  for (const [id, w] of Object.entries(scene.wires)) {
    if (!w.label) continue;
    const mid = makeWire(w.from, w.to, 48, 1, w.straight ?? false).pts[24]!;
    const el = document.createElement("div");
    el.className = "tx-wlabel";
    el.dataset.wire = id;
    Object.assign(el.style, { left: `${mid[0]}px`, top: `${mid[1]}px` });
    el.textContent = w.label;
    world.appendChild(el);
  }
  const nodes: Record<string, HTMLElement> = {};
  for (const [id, n] of Object.entries(scene.nodes)) {
    const el = document.createElement("div");
    el.className = `tx-node k-${n.kind}`;
    el.dataset.node = id;
    Object.assign(el.style, { left: `${n.x}px`, top: `${n.y}px`, width: `${n.w}px`, height: `${n.h}px` });
    el.innerHTML = opts.nodeBody(id, n);
    world.appendChild(el);
    nodes[id] = el;
  }
  return {
    root,
    world,
    back: root.querySelector(".tx-back")!,
    front: root.querySelector(".tx-front")!,
    chart: root.querySelector(".tx-chart")!,
    chartValue: root.querySelector(".tx-chartv")!,
    tagText: root.querySelector(".tx-tagtext")!,
    zoom: root.querySelector<HTMLButtonElement>(".tx-zoom")!,
    nodes,
  };
}

/** Number tiles above the stage; built once, then only their text and mood change. */
export function renderTiles(el: HTMLElement, tiles: Tile[]): void {
  if (el.childElementCount !== tiles.length || el.dataset.ids !== tiles.map((t) => t.id).join()) {
    el.dataset.ids = tiles.map((t) => t.id).join();
    el.innerHTML = tiles
      .map((t) => `<div class="tx-met" data-tile="${t.id}"><div class="tx-mh"><span class="tx-k">${esc(t.label)}</span><span class="tx-mi h-${t.hue}">${iconSvg(t.icon, "")}</span></div><div class="tx-v"></div><div class="tx-d"></div></div>`)
      .join("");
  }
  tiles.forEach((t, i) => {
    const m = el.children[i] as HTMLElement;
    m.classList.toggle("good", t.mood === "good");
    m.classList.toggle("bad", t.mood === "bad");
    // A step can reuse a tile id for a different number: keep the label and icon in step with it.
    const k = m.querySelector<HTMLElement>(".tx-k")!;
    if (k.textContent !== t.label) k.textContent = t.label;
    const mi = m.querySelector<HTMLElement>(".tx-mi")!;
    if (mi.dataset.icon !== `${t.icon} ${t.hue}`) {
      mi.dataset.icon = `${t.icon} ${t.hue}`;
      mi.className = `tx-mi h-${t.hue}`;
      mi.innerHTML = iconSvg(t.icon, "");
    }
    const v = m.querySelector<HTMLElement>(".tx-v")!;
    const d = m.querySelector<HTMLElement>(".tx-d")!;
    if (v.textContent !== t.value) v.textContent = t.value;
    // Words like "Least connections" don't fit a tile at full size: smaller, and broken only between words.
    v.classList.toggle("long", t.value.length > 10);
    if (d.textContent !== t.note) d.textContent = t.note;
  });
}
