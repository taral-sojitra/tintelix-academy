import type { SceneSpec } from "@tintelix/schema";
import { iconSvg, type IconName } from "../icons";
import { KEY_COUNT } from "../scenes/cache-aside";
import type { Tile } from "../scenes/types";

const KIND_ICON: Record<SceneSpec["nodes"][string]["kind"], IconName> = { users: "users", lb: "lb", app: "server", cache: "bolt", db: "db" };
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export interface StageDom {
  root: HTMLElement;
  world: HTMLElement;
  back: HTMLCanvasElement;
  front: HTMLCanvasElement;
  chart: HTMLCanvasElement;
  chartValue: HTMLElement;
  tagText: HTMLElement;
  nodes: Record<string, HTMLElement>;
  keys: HTMLElement[];
  ttl: { box: HTMLElement; text: HTMLElement; ring: SVGCircleElement } | null;
  meters: Record<string, { bar: HTMLElement; label: HTMLElement | null }>;
  queueLabel: HTMLElement | null;
  newBadge: HTMLElement | null;
}

function nodeHtml(id: string, n: SceneSpec["nodes"][string]): string {
  const tile = (sm = false) => `<span class="tx-tile k-${n.kind}${sm ? " sm" : ""}">${iconSvg(KIND_ICON[n.kind], "")}</span>`;
  const head = `<div class="tx-nh">${tile()}<div><b>${esc(n.label)}</b><span class="tx-sub">${esc(n.sub)}</span></div></div>`;
  switch (n.kind) {
    case "app":
      return `<div class="tx-nh">${tile(true)}<b>${esc(n.label)}</b><span class="tx-leds"><i></i><i></i><i></i></span></div><div class="tx-row"><span class="tx-meter"><i data-meter="${id}"></i></span></div>`;
    case "cache":
      return `<div class="tx-nh">${tile()}<div><b>${esc(n.label)} <span class="tx-badge" data-new>NEW</span></b><span class="tx-sub">${esc(n.sub)}</span></div></div>
        <div class="tx-ttl" data-ttl><span data-ttl-text></span><svg viewBox="0 0 26 26"><circle cx="13" cy="13" r="10" class="tx-ttl-track"/><circle cx="13" cy="13" r="10" class="tx-ttl-ring" data-ttl-ring stroke-dasharray="62.83" stroke-dashoffset="0"/></svg></div>
        <div class="tx-keys">${"<i></i>".repeat(KEY_COUNT)}</div>
        <div class="tx-row"><span class="tx-meter"><i data-meter="${id}"></i></span><span data-meter-label="${id}"></span></div>`;
    case "db":
      return `${head}<div class="tx-row"><span class="tx-meter"><i data-meter="${id}"></i></span><span data-meter-label="${id}"></span></div>
        <div class="tx-row tx-spread"><span>queue</span><span data-queue></span></div><div class="tx-lane"></div>`;
    default:
      return head;
  }
}

/** Builds the stage: back canvas, HTML boxes, front canvas and the overlays. */
export function buildStage(host: HTMLElement, scene: SceneSpec, legend: [string, string][]): StageDom {
  host.innerHTML = `<div class="tx-stage">
    <canvas class="tx-back" aria-hidden="true"></canvas>
    <div class="tx-world" style="width:${scene.world.w}px;height:${scene.world.h}px"></div>
    <canvas class="tx-front" aria-hidden="true"></canvas>
    <div class="tx-ov tx-tagline"><span class="tx-live"></span><span class="tx-tagtext"></span></div>
    <div class="tx-ov tx-legend" aria-hidden="true">${legend.map(([c, l]) => `<span><i style="background:var(--${c})"></i>${esc(l)}</span>`).join("")}</div>
    <div class="tx-ov tx-chartbox" aria-hidden="true"><div class="tx-ch"><span>DB LOAD · LAST 30 S</span><b class="tx-chartv"></b></div><canvas class="tx-chart"></canvas></div>
  </div>`;
  const root = host.querySelector<HTMLElement>(".tx-stage")!;
  const world = root.querySelector<HTMLElement>(".tx-world")!;
  const nodes: Record<string, HTMLElement> = {};
  for (const [id, n] of Object.entries(scene.nodes)) {
    const el = document.createElement("div");
    el.className = `tx-node k-${n.kind}`;
    el.dataset.node = id;
    Object.assign(el.style, { left: `${n.x}px`, top: `${n.y}px`, width: `${n.w}px`, height: `${n.h}px` });
    el.innerHTML = nodeHtml(id, n);
    world.appendChild(el);
    nodes[id] = el;
  }
  const meters: StageDom["meters"] = {};
  for (const bar of world.querySelectorAll<HTMLElement>("[data-meter]")) {
    const id = bar.dataset.meter!;
    meters[id] = { bar, label: world.querySelector<HTMLElement>(`[data-meter-label="${id}"]`) };
  }
  const ttlBox = world.querySelector<HTMLElement>("[data-ttl]");
  return {
    root,
    world,
    back: root.querySelector(".tx-back")!,
    front: root.querySelector(".tx-front")!,
    chart: root.querySelector(".tx-chart")!,
    chartValue: root.querySelector(".tx-chartv")!,
    tagText: root.querySelector(".tx-tagtext")!,
    nodes,
    keys: [...world.querySelectorAll<HTMLElement>(".tx-keys i")],
    ttl: ttlBox ? { box: ttlBox, text: ttlBox.querySelector("[data-ttl-text]")!, ring: ttlBox.querySelector("[data-ttl-ring]")! } : null,
    meters,
    queueLabel: world.querySelector("[data-queue]"),
    newBadge: world.querySelector("[data-new]"),
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
    const v = m.querySelector<HTMLElement>(".tx-v")!;
    const d = m.querySelector<HTMLElement>(".tx-d")!;
    if (v.textContent !== t.value) v.textContent = t.value;
    if (d.textContent !== t.note) d.textContent = t.note;
  });
}
