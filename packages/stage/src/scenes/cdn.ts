import type { Inputs, Outputs, SceneNode, SceneSpec } from "@tintelix/schema";
import { formatOutput } from "@tintelix/schema/format";
import type { Effects } from "../effects";
import { makeWire } from "../geometry";
import { nodeHead } from "../render/dom";
import { cdn } from "../routers/cdn";
import type { SimEvent } from "../sim";
import type { SceneChart, SceneRuntime, StepContext, Tile, WireStyle } from "./types";

export const COPY_COUNT = 24;
/** Visual requests per second at 1×. */
const R_VIS = 6.5;
/** In the stale step, seconds before the origin's price changes. */
const PRICE_CHANGE_AT = 3;
/** In the purge step, seconds before the purge clears the edge. */
const PURGE_AT = 1.5;
const LEGEND: SceneRuntime["legend"] = [["cyan", "request"], ["green", "from the edge"], ["amber", "from the origin"], ["violet", "copy stored"]];
const CHART: SceneChart = { label: "PAGE LOAD · LAST 30 S", output: "pageMs", max: 1000, danger: 300 };

type Path = "direct" | "hit" | "miss";

/**
 * The page time shown above Users for one finished request, in ms, drawn so the labels agree with
 * the model: about 5% of all requests land above its p95 when there are enough misses to fill that
 * 5%, and a hit is never slower than p95.
 */
export function cdnLatencyMs(path: Path, live: Outputs, rand: () => number): number {
  const p95 = live.p95 ?? 0;
  if (path === "direct") return rand() < 0.05 ? p95 * (1 + rand() * 0.08) : p95 * (0.95 + rand() * 0.05);
  const hitPage = live.hitPageMs ?? 0;
  if (path === "hit") return Math.min(p95, hitPage) * (0.9 + rand() * 0.1);
  const missPage = live.missPageMs ?? 0;
  const missShare = 1 - (live.edgeHitPct ?? 0) / 100;
  const aboveP95 = missShare > 0 ? Math.min(1, 0.05 / missShare) : 1;
  return rand() < aboveP95 ? Math.max(p95, missPage) * (1 + rand() * 0.1) : Math.min(p95, missPage) * (0.92 + rand() * 0.08);
}

export interface CdnCopy {
  on: boolean;
  /** Holds the old version of its page. */
  stale: boolean;
  flash: "" | "hit" | "fill" | "purge";
  t: number;
}

export interface CdnState {
  copies: CdnCopy[];
  /** The product price each place shows; the edge shows null once purged and not yet refilled. */
  price: { origin: number; edge: number | null };
  hasEdge: boolean;
  /** 0..1 while the edge and its wires grow in. */
  reveal: number;
  pings: Record<string, number>;
}

export type CdnScene = SceneRuntime & { state: CdnState };

export function createCdnScene(o: { fx: Effects; rand: () => number; scene: SceneSpec }): CdnScene {
  const { fx, rand } = o;
  const node = (id: string) => o.scene.nodes[id] ?? { x: 0, y: 0, w: 0, h: 0 };
  const centre = (id: string): [number, number] => [node(id).x + node(id).w / 2, node(id).y + node(id).h / 2];
  const [ex, ey] = centre("edge");
  const [ox, oy] = centre("origin");
  const users = node("users");
  const usersEdge: [number, number] = [users.x + users.w, users.y + users.h / 2];
  const state: CdnState = {
    copies: Array.from({ length: COPY_COUNT }, () => ({ on: false, stale: false, flash: "", t: 0 })),
    price: { origin: 999, edge: null },
    hasEdge: false,
    reveal: 0,
    pings: {},
  };
  const els: {
    nodes: Record<string, HTMLElement>;
    copies: HTMLElement[];
    badge: HTMLElement | null;
    prices: Record<string, HTMLElement>;
    priceRows: HTMLElement[];
    meter: { bar: HTMLElement; label: HTMLElement | null } | null;
    labels: Record<string, HTMLElement>;
  } = { nodes: {}, copies: [], badge: null, prices: {}, priceRows: [], meter: null, labels: {} };
  let ctxRef: StepContext | null = null;
  let revealTarget = 0;
  let copyClock = 0;
  let changed = false;
  let purged = false;

  const mode = (ctx: StepContext) => ctx.step.sim?.mode ?? "none";
  const prices = (ctx: StepContext) => ({ old: ctx.inputs.oldPrice ?? 999, now: ctx.inputs.newPrice ?? 799 });
  const afterChange = (ctx: StepContext) => (ctx.inputs.purge ?? 0) >= 0.5;
  const showPrices = (ctx: StepContext) => mode(ctx) === "stale" || mode(ctx) === "purge" || afterChange(ctx);
  const curve = (s: number) => 1 - Math.exp(-Math.max(0, s - 0.4) / 2.8);

  /** Share of pages the edge holds right now. */
  function filled(ctx: StepContext): number {
    if (!state.hasEdge) return 0;
    const t = ctx.stepTime;
    switch (mode(ctx)) {
      case "warm":
        return curve(t);
      case "purge":
        return t < PURGE_AT ? 1 : curve(t - PURGE_AT);
      default:
        return 1;
    }
  }

  const liveInputs = (ctx: StepContext): Inputs => ({ ...ctx.inputs, edge: state.hasEdge ? 1 : 0, filled: filled(ctx) });
  const router = cdn({
    hasEdge: () => state.hasEdge,
    hitRate: () => (ctxRef ? (ctxRef.model.run(liveInputs(ctxRef)).edgeHitPct ?? 0) / 100 : 0),
  });

  const pick = (on: boolean) => {
    const c = state.copies.filter((k) => k.on === on);
    return c.length ? c[Math.floor(rand() * c.length)]! : null;
  };
  const flash = (c: CdnCopy, f: CdnCopy["flash"]) => {
    c.flash = f;
    c.t = 0.28;
  };

  return {
    router,
    fx,
    state,
    legend: LEGEND,
    sim: { ratePerSec: R_VIS },
    chart: CHART,
    lane: null,

    liveInputs,

    enterStep(ctx) {
      ctxRef = ctx;
      const had = state.hasEdge;
      state.hasEdge = ctx.visible.has("edge");
      revealTarget = state.hasEdge ? 1 : 0;
      if (state.hasEdge && !had) {
        state.reveal = 0;
        fx.burst(ex, ey, 34, ["green", "cyan", "white"]);
      }
      if (els.badge) els.badge.hidden = !(ctx.step.scene?.add ?? []).includes("edge");
      const m = mode(ctx);
      const p = prices(ctx);
      changed = false;
      purged = false;
      if (m === "stale") state.price = { origin: p.old, edge: state.hasEdge ? p.old : null };
      else if (m === "purge") state.price = { origin: p.now, edge: p.old };
      else {
        const shown = afterChange(ctx) ? p.now : p.old;
        state.price = { origin: shown, edge: state.hasEdge ? shown : null };
      }
      const full = state.hasEdge && m !== "warm";
      for (const c of state.copies) {
        c.on = full;
        // The purge step opens with the edge still holding the old version.
        c.stale = full && m === "purge";
        c.flash = "";
        c.t = 0;
      }
    },

    update(dt, ctx) {
      ctxRef = ctx;
      if (state.reveal < revealTarget) state.reveal = Math.min(revealTarget, state.reveal + dt / 0.9);
      else if (state.reveal > revealTarget) state.reveal = Math.max(revealTarget, state.reveal - dt / 0.5);
      const m = mode(ctx);
      const t = ctx.stepTime;
      const p = prices(ctx);
      const edge = node("edge");
      if (m === "stale" && !changed && t >= PRICE_CHANGE_AT) {
        changed = true;
        state.price.origin = p.now;
        for (const c of state.copies) if (c.on) c.stale = true;
        fx.float(node("origin").x + 8, node("origin").y - 16, `NEW PRICE ${formatOutput("newPrice", p.now)}`, "green", true);
        fx.float(edge.x + 4, edge.y - 16, `STILL ${formatOutput("oldPrice", p.old)}`, "amber", true);
        fx.ripple(ox, oy, "green", 60, 0.8);
      }
      if (m === "purge" && !purged && t >= PURGE_AT) {
        purged = true;
        for (const c of state.copies) {
          c.on = false;
          c.stale = false;
          flash(c, "purge");
        }
        state.price.edge = null;
        fx.float(edge.x + 4, edge.y - 16, "PURGED", "violet", true);
        fx.ripple(ex, ey, "violet", 90, 0.9);
        fx.burst(ex, ey, 40, ["violet", "white"]);
      }
      copyClock -= dt;
      if (copyClock <= 0 && state.hasEdge) {
        const want = Math.round(COPY_COUNT * filled(ctx));
        if (state.copies.filter((c) => c.on).length < want) {
          const c = pick(false);
          if (c) {
            c.on = true;
            c.stale = false;
            flash(c, "fill");
          }
        }
        copyClock = 0.1;
      }
      for (const c of state.copies) if (c.t > 0 && (c.t -= dt) <= 0) c.flash = "";
      for (const n in state.pings) state.pings[n] = Math.max(0, state.pings[n]! - dt * 5);
    },

    onEvent(e: SimEvent, ctx) {
      const slow = (ctx.step.sim?.speed ?? 1) < 1;
      const [x, y] = e.at;
      switch (e.kind) {
        case "pass":
          state.pings.origin = 1;
          break;
        case "hit": {
          state.pings.edge = 1;
          const c = pick(true);
          if (c) flash(c, "hit");
          fx.ripple(x, y, "green", 22, 0.55);
          if (slow || rand() < 0.12) fx.float(x - 70, y - 12, "✓ HIT", "green");
          break;
        }
        case "miss":
          state.pings.edge = 1;
          fx.ripple(x, y, "amber", 22, 0.55);
          if (slow || rand() < 0.15) fx.float(x - 60, y - 12, "✕ MISS", "amber");
          break;
        case "fill": {
          state.pings.edge = 1;
          if (state.price.edge === null) state.price.edge = state.price.origin;
          const c = pick(false) ?? pick(true);
          if (c) {
            c.on = true;
            c.stale = false;
            flash(c, "fill");
          }
          fx.ripple(x, y, "violet", 16, 0.5);
          if (slow) fx.float(x - 60, y + 12, "+ copy stored", "violet");
          break;
        }
        case "reply": {
          state.pings.users = 1;
          const path: Path = !state.hasEdge ? "direct" : e.hit ? "hit" : "miss";
          fx.ripple(usersEdge[0], usersEdge[1], path === "hit" ? "green" : "amber", 20, 0.5);
          if (slow || rand() < 0.28) {
            const ms = cdnLatencyMs(path, ctx.model.run(liveInputs(ctx)), rand);
            fx.float(users.x + 36 + rand() * 70, users.y - 16, formatOutput("pageMs", ms), path === "hit" ? "green" : ms > 300 ? "red" : "amber");
          }
          break;
        }
      }
    },

    wireStyles(): WireStyle[] {
      const out: WireStyle[] = [];
      const direct = 1 - state.reveal;
      if (direct > 0) {
        out.push({ wire: "u_origin", color: "blue", alpha: 0.42 * direct, width: 2 });
        out.push({ wire: "u_origin", color: "cyan", alpha: 0.45 * direct, width: 2, dash: [2, 14], flowDir: 1 });
      }
      if (state.reveal > 0) {
        out.push({ wire: "u_edge", color: "green", alpha: 0.55, width: 2, progress: state.reveal });
        out.push({ wire: "u_edge", color: "cyan", alpha: 0.45, width: 2, dash: [2, 14], flowDir: 1, progress: state.reveal });
        out.push({ wire: "edge_origin", color: "amber", alpha: 0.4, width: 1.8, dash: [5, 7], flowDir: 1, progress: state.reveal });
      }
      return out;
    },

    tiles(d, ctx): Tile[] {
      const has = state.hasEdge;
      const base = ctx.model.run({ ...ctx.inputs, edge: 0 });
      const page = d.pageMs ?? 0;
      const p95 = d.p95 ?? 0;
      const hit = d.edgeHitPct ?? 0;
      const origin = d.originReqs ?? 0;
      const traffic = d.traffic ?? 0;
      const fifth: Tile = showPrices(ctx)
        ? {
            id: "stale",
            label: "Old price for",
            icon: "hourglass",
            hue: "blue",
            value: formatOutput("staleSec", d.staleSec ?? 0),
            note: afterChange(ctx) ? "purge on change" : "until the copy expires",
            mood: afterChange(ctx) ? "good" : "bad",
          }
        : { id: "rtt", label: "Round trip", icon: "clock", hue: "blue", value: formatOutput("rttOriginMs", d.rttOriginMs ?? 0), note: `${formatOutput("originKm", d.originKm ?? 0)} km away`, mood: "" };
      return [
        {
          id: "page",
          label: "Page load",
          icon: "timer",
          hue: "cyan",
          value: formatOutput("pageMs", page),
          note: has && page < (base.noEdgePageMs ?? 0) - 10 ? `▼ from ${formatOutput("noEdgePageMs", base.noEdgePageMs ?? 0)}` : "typical page",
          mood: page > 300 ? "bad" : page < 100 ? "good" : "",
        },
        { id: "p95", label: "Slowest 5%", icon: "timer", hue: "violet", value: formatOutput("p95", p95), note: "slowest 5%", mood: p95 > 300 ? "bad" : p95 < 100 ? "good" : "" },
        {
          id: "hits",
          label: "Edge hits",
          icon: "bolt",
          hue: "green",
          value: has ? formatOutput("edgeHitPct", hit) : "—",
          note: !has ? "no edge" : filled(ctx) < 0.99 ? "edge warming up" : "served in Mumbai",
          mood: has && hit > 90 ? "good" : "",
        },
        {
          id: "origin",
          label: "Origin load",
          icon: "activity",
          hue: "amber",
          value: `${formatOutput("originReqs", origin)}/s`,
          note: has && origin < traffic * 0.97 ? `▼ from ${formatOutput("traffic", traffic)}/s` : "every request",
          mood: origin < traffic / 2 ? "good" : origin > traffic * 0.9 ? "bad" : "",
        },
        fifth,
      ];
    },

    nodeBody(id: string, n: SceneNode): string {
      const priceRow = (label: string) =>
        `<div class="tx-row tx-spread" data-price-row hidden><span>${label}</span><span class="tx-price" data-price="${id}"></span></div>`;
      switch (n.kind) {
        case "edge":
          return `${nodeHead(n, { badge: "NEW" })}<div class="tx-keys" data-copies>${"<i></i>".repeat(COPY_COUNT)}</div>${priceRow("shows")}`;
        case "origin":
          return `${nodeHead(n)}<div class="tx-row"><span class="tx-meter"><i data-meter="${id}"></i></span><span data-meter-label="${id}"></span></div>${priceRow("price")}`;
        default:
          return nodeHead(n);
      }
    },

    mount(world: HTMLElement) {
      for (const el of world.querySelectorAll<HTMLElement>("[data-node]")) els.nodes[el.dataset.node!] = el;
      els.copies = [...world.querySelectorAll<HTMLElement>("[data-copies] i")];
      els.badge = world.querySelector("[data-new]");
      for (const el of world.querySelectorAll<HTMLElement>("[data-price]")) els.prices[el.dataset.price!] = el;
      els.priceRows = [...world.querySelectorAll<HTMLElement>("[data-price-row]")];
      const bar = world.querySelector<HTMLElement>('[data-meter="origin"]');
      els.meter = bar ? { bar, label: world.querySelector<HTMLElement>('[data-meter-label="origin"]') } : null;
      for (const el of world.querySelectorAll<HTMLElement>(".tx-wlabel")) els.labels[el.dataset.wire!] = el;
      // The trip across town gets its own small label, made here because it says how many trips a page needs.
      const w = o.scene.wires.u_edge;
      if (w && !els.labels.u_edge) {
        const mid = makeWire(w.from, w.to).pts[24]!;
        const el = document.createElement("div");
        el.className = "tx-wlabel tx-wlabel-short";
        el.dataset.wire = "u_edge";
        Object.assign(el.style, { left: `${mid[0]}px`, top: `${mid[1]}px` });
        const first = world.querySelector(".tx-node");
        world.insertBefore(el, first);
        els.labels.u_edge = el;
      }
    },

    paintWidgets(display: Outputs, ctx: StepContext) {
      els.copies.forEach((el, i) => {
        const c = state.copies[i]!;
        const cls = c.flash === "purge" ? "exp" : c.flash === "hit" ? "on flash" : c.flash === "fill" ? "on fill" : c.on ? (c.stale ? "on stale" : "on") : "";
        if (el.className !== cls) el.className = cls;
      });
      const show = showPrices(ctx);
      for (const row of els.priceRows) row.hidden = !show;
      if (els.prices.origin) els.prices.origin.textContent = formatOutput("newPrice", state.price.origin);
      if (els.prices.edge) {
        els.prices.edge.textContent = state.price.edge === null ? "—" : formatOutput("oldPrice", state.price.edge);
        els.prices.edge.classList.toggle("stale", state.price.edge !== null && state.price.edge !== state.price.origin);
      }
      if (els.meter) {
        const traffic = display.traffic || 1;
        els.meter.bar.style.width = `${Math.min(100, ((display.originReqs ?? 0) / traffic) * 100)}%`;
        if (els.meter.label) els.meter.label.textContent = `${formatOutput("originReqs", display.originReqs ?? 0)}/s`;
      }
      const km = `${formatOutput("originKm", display.originKm ?? 0)} km`;
      const rtt = formatOutput("rttOriginMs", display.rttOriginMs ?? 0);
      const label = (wire: string, text: string, visible: boolean) => {
        const el = els.labels[wire];
        if (!el) return;
        el.hidden = !visible;
        if (el.textContent !== text) el.textContent = text;
      };
      const trips = `×${formatOutput("trips", display.trips ?? 0)} per page`;
      label("u_origin", `${km} · ${rtt} · ${trips}`, !state.hasEdge);
      label("edge_origin", `${km} · ${rtt}`, state.hasEdge);
      label("u_edge", `${formatOutput("rttEdgeMs", display.rttEdgeMs ?? 0)} · ${trips}`, state.hasEdge);
      for (const [id, el] of Object.entries(els.nodes)) el.style.setProperty("--ping", (state.pings[id] ?? 0).toFixed(2));
    },

    chartSample(live: Outputs): number {
      return Math.min(CHART.max, (live.pageMs ?? 0) * (1 + (rand() * 0.04 - 0.02)));
    },
  };
}
