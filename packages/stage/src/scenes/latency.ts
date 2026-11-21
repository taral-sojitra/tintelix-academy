import type { Inputs, Outputs, SceneNode, SceneSpec } from "@tintelix/schema";
import { formatOutput } from "@tintelix/schema/format";
import type { Effects } from "../effects";
import { nodeHead } from "../render/dom";
import { latency } from "../routers/latency";
import type { Hue, SimEvent } from "../sim";
import type { SceneChart, SceneRuntime, StepContext, Tile, WireStyle } from "./types";

/** Visual requests per second at 1×. */
const R_VIS = 5;
/** Service cells drawn; a page with more calls shows its count. */
export const MAX_CELLS = 20;
/** Dots kept in the histogram at once. */
export const DOTS = 24;
const DOT_LIFE = 3;
const LEGEND: SceneRuntime["legend"] = [["cyan", "request"], ["green", "fast reply"], ["amber", "copy won"], ["red", "slow reply"]];
const CHART: SceneChart = { label: "AVERAGE · LAST 30 S", output: "meanMs", max: 250, danger: 100 };

/** Label rows above the plot, one per marker, so equal values never print on top of each other. */
export const MARKER_ROWS = { avg: 0, p50: 1, p99: 2 } as const;
type Marker = keyof typeof MARKER_ROWS;

/** Histogram layout inside its SVG, in px. */
const PAD = { left: 16, right: 16, top: 54, bottom: 22 };
const ROW_H = 15;

/** Position of a latency on a log axis from 1 ms (0) to 1,000 ms (width), clamped. */
export function histX(ms: number, width: number): number {
  const f = Math.log10(Math.max(1, Math.min(1000, ms))) / 3;
  return f * width;
}

/** Bar height for a share in %, on a square-root scale so a 1% hump stays visible. */
export function barHeight(sharePct: number, height: number): number {
  return Math.sqrt(Math.max(0, Math.min(100, sharePct)) / 100) * height;
}

/** Seconds a request is held, in slow motion: a 100× slower request waits 10× longer, never over 3 s. */
export function holdSec(ms: number, fastMs: number): number {
  return Math.min(3, 0.25 * Math.sqrt(Math.max(ms, 0) / Math.max(fastMs, 1e-9)));
}

/** One latency drawn from the model's page shares, for r in [0, 1). */
export function sampleMs(live: Outputs, r: number): number {
  const fast = (live.pageFastPct ?? 100) / 100;
  const mid = (live.pageMidPct ?? 0) / 100;
  if (r < fast) return live.fastMs ?? 0;
  if (r < fast + mid) return live.hedgeReplyMs ?? live.slowMs ?? 0;
  return live.slowMs ?? 0;
}

export interface LatencyCell {
  tone: "" | "run" | "slow" | "copy";
  /** Seconds left before the cell finishes. */
  t: number;
}

export interface LatencyDot {
  ms: number;
  /** Horizontal jitter in px. */
  jitter: number;
  /** 0 at the top of the plot, 1 at rest. */
  fall: number;
  /** Seconds left on screen. */
  life: number;
}

export interface LatencyState {
  fanOut: boolean;
  /** 0..1 while the services and their wire grow in. */
  reveal: number;
  cells: LatencyCell[];
  dots: LatencyDot[];
  pings: Record<string, number>;
}

export type LatencyScene = SceneRuntime & { state: LatencyState };

type Tone = "fast" | "mid" | "slow";

export function createLatencyScene(o: { fx: Effects; rand: () => number; scene: SceneSpec }): LatencyScene {
  const { fx, rand } = o;
  const node = (id: string) => o.scene.nodes[id] ?? { x: 0, y: 0, w: 0, h: 0 };
  const users = node("users");
  const state: LatencyState = {
    fanOut: false,
    reveal: 0,
    cells: Array.from({ length: MAX_CELLS }, () => ({ tone: "", t: 0 })),
    dots: Array.from({ length: DOTS }, () => ({ ms: 0, jitter: 0, fall: 1, life: 0 })),
    pings: {},
  };
  const hist = node("histogram");
  const svgW = Math.max(1, hist.w - 24);
  // The node header and padding take about 64 px; the plot gets the rest.
  const svgH = Math.max(1, hist.h - 64);
  const plotW = Math.max(1, svgW - PAD.left - PAD.right);
  const plotH = Math.max(1, svgH - PAD.top - PAD.bottom);
  const xOf = (ms: number) => PAD.left + histX(ms, plotW);

  const els: {
    nodes: Record<string, HTMLElement>;
    cells: HTMLElement[];
    calls: HTMLElement | null;
    bars: Record<Tone, { bar: SVGElement; label: SVGElement } | null>;
    markers: Record<Marker, { line: SVGElement; label: SVGElement } | null>;
    dots: SVGElement[];
  } = { nodes: {}, cells: [], calls: null, bars: { fast: null, mid: null, slow: null }, markers: { avg: null, p50: null, p99: null }, dots: [] };

  let ctxRef: StepContext | null = null;
  let revealTarget = 0;
  let nextDot = 0;

  const mode = (ctx: StepContext) => ctx.step.sim?.mode ?? "none";
  const pageMode = (ctx: StepContext) => mode(ctx) === "fanout" || mode(ctx) === "hedge";
  const liveInputs = (ctx: StepContext): Inputs => ({ ...ctx.inputs });
  const live = (): Outputs => (ctxRef ? ctxRef.model.run(liveInputs(ctxRef)) : {});
  const tone = (ms: number, out: Outputs): Tone => (ms <= (out.fastMs ?? 0) + 1e-9 ? "fast" : ms >= (out.slowMs ?? 0) - 1e-9 ? "slow" : "mid");
  const HUE: Record<Tone, Hue> = { fast: "green", mid: "amber", slow: "red" };

  const router = latency({
    fanOut: () => state.fanOut,
    sample: () => sampleMs(live(), rand()),
    hold: (ms) => holdSec(ms, live().fastMs ?? 2),
    hue: (ms) => HUE[tone(ms, live())],
  });

  const set = (el: Element | null | undefined, attrs: Record<string, string | number>) => {
    if (!el) return;
    for (const [k, v] of Object.entries(attrs)) {
      const s = String(v);
      if (el.getAttribute(k) !== s) el.setAttribute(k, s);
    }
  };
  const text = (el: Element | null | undefined, t: string) => {
    if (el && el.textContent !== t) el.textContent = t;
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
      const had = state.fanOut;
      state.fanOut = pageMode(ctx) && ctx.visible.has("services");
      revealTarget = state.fanOut ? 1 : 0;
      if (state.fanOut && !had) {
        state.reveal = 0;
        const s = node("services");
        fx.burst(s.x + s.w / 2, s.y + s.h / 2, 30, ["cyan", "white"]);
      }
      for (const c of state.cells) {
        c.tone = "";
        c.t = 0;
      }
      for (const d of state.dots) d.life = 0;
    },

    update(dt, ctx) {
      ctxRef = ctx;
      if (state.reveal < revealTarget) state.reveal = Math.min(revealTarget, state.reveal + dt / 0.9);
      else if (state.reveal > revealTarget) state.reveal = Math.max(revealTarget, state.reveal - dt / 0.5);
      for (const c of state.cells) {
        if (c.t > 0 && (c.t -= dt) <= 0) {
          c.t = 0;
          c.tone = "";
        }
      }
      for (const d of state.dots) {
        if (d.life <= 0) continue;
        d.life = Math.max(0, d.life - dt);
        if (d.fall < 1) d.fall = ctx.reducedMotion ? 1 : Math.min(1, d.fall + dt / 0.55);
      }
      for (const n in state.pings) state.pings[n] = Math.max(0, state.pings[n]! - dt * 5);
    },

    onEvent(e: SimEvent, ctx) {
      ctxRef = ctx;
      const out = live();
      switch (e.kind) {
        case "pass":
          state.pings[e.node] = 1;
          break;
        case "work": {
          state.pings[e.node] = 1;
          if (e.node !== "services") break;
          const n = Math.min(MAX_CELLS, Math.max(1, Math.round(out.calls ?? 1)));
          const fast = holdSec(out.fastMs ?? 2, out.fastMs ?? 2);
          for (let i = 0; i < MAX_CELLS; i++) state.cells[i] = i < n ? { tone: "run", t: fast } : { tone: "", t: 0 };
          const kind = tone(e.ms, out);
          if (kind !== "fast") {
            const c = state.cells[Math.floor(rand() * n)]!;
            c.tone = kind === "slow" ? "slow" : "copy";
            c.t = holdSec(e.ms, out.fastMs ?? 2);
            if (kind === "mid") fx.float(e.at[0] - 70, e.at[1] + 22, "copy sent", "amber");
          }
          break;
        }
        case "done": {
          state.pings.users = 1;
          const kind = tone(e.ms, out);
          fx.ripple(users.x + users.w, users.y + users.h / 2, HUE[kind], 20, 0.5);
          const slowMo = (ctx.step.sim?.speed ?? 1) < 1;
          if (slowMo || kind !== "fast" || rand() < 0.35) {
            fx.float(users.x + 30 + rand() * 80, users.y + users.h + 16, formatOutput("pageMs", e.ms), HUE[kind]);
          }
          const d = state.dots[nextDot]!;
          nextDot = (nextDot + 1) % DOTS;
          d.ms = e.ms;
          d.jitter = (rand() - 0.5) * 16;
          d.fall = ctx.reducedMotion ? 1 : 0;
          d.life = DOT_LIFE;
          break;
        }
      }
    },

    wireStyles(): WireStyle[] {
      const out: WireStyle[] = [
        { wire: "users_app", color: "blue", alpha: 0.42, width: 2 },
        { wire: "users_app", color: "cyan", alpha: 0.45, width: 2, dash: [2, 14], flowDir: 1 },
      ];
      if (state.reveal > 0) {
        out.push({ wire: "app_services", color: "blue", alpha: 0.42, width: 2, progress: state.reveal });
        out.push({ wire: "app_services", color: "cyan", alpha: 0.45, width: 2, dash: [2, 14], flowDir: 1, progress: state.reveal });
      }
      return out;
    },

    tiles(d, ctx): Tile[] {
      const m = mode(ctx);
      const dash = m === "average";
      const page = pageMode(ctx);
      const slowMs = d.slowMs ?? 0;
      const p50 = page ? d.pageP50Ms ?? 0 : d.callP50Ms ?? 0;
      const p99 = page ? d.pageP99Ms ?? 0 : d.callP99Ms ?? 0;
      const fifth: Tile = page
        ? {
            id: "fifth",
            label: "Extra calls",
            icon: "shuffle",
            hue: "cyan",
            value: formatOutput("hedgedPct", d.hedgedPct ?? 0),
            note: m === "hedge" ? `copies after ${formatOutput("hedgeMs", d.hedgeMs ?? 0)}` : "no copies yet",
            mood: (d.hedgedPct ?? 0) > 20 ? "bad" : "",
          }
        : {
            id: "fifth",
            label: "Slow a day",
            icon: "users",
            hue: "cyan",
            value: dash ? "—" : formatOutput("slowPerDay", d.slowPerDay ?? 0),
            note: dash ? "not on the dashboard" : `of ${formatOutput("perDay", d.perDay ?? 0)} requests`,
            mood: "",
          };
      return [
        {
          id: "avg",
          label: "Average",
          icon: "gauge",
          hue: "amber",
          value: formatOutput("meanMs", d.meanMs ?? 0),
          note: "what the dashboard shows",
          mood: "",
        },
        {
          id: "p50",
          label: page ? "Page p50" : "p50",
          icon: "timer",
          hue: "green",
          value: dash ? "—" : formatOutput("pageP50Ms", p50),
          note: dash ? "not on the dashboard" : "half are faster",
          mood: dash ? "" : p50 >= slowMs ? "bad" : "good",
        },
        {
          id: "p99",
          label: page ? "Page p99" : "p99",
          icon: "alert",
          hue: "violet",
          value: dash ? "—" : formatOutput("pageP99Ms", p99),
          note: dash ? "not on the dashboard" : "99% are faster",
          mood: dash ? "" : p99 >= slowMs ? "bad" : p99 < 50 ? "good" : "",
        },
        {
          id: "slow",
          label: page ? "Slow pages" : "Slow requests",
          icon: "hourglass",
          hue: "blue",
          value: dash ? "—" : formatOutput(page ? "pageSlowPct" : "slowPct", (page ? d.pageSlowPct : d.slowPct) ?? 0),
          note: dash ? "not on the dashboard" : `wait ${formatOutput("slowMs", slowMs)}`,
          mood: dash ? "" : ((page ? d.pageSlowPct : d.slowPct) ?? 0) >= 5 ? "bad" : "",
        },
        fifth,
      ];
    },

    nodeBody(id: string, n: SceneNode): string {
      switch (n.kind) {
        case "services":
          return `${nodeHead(n)}<div class="tx-cells" data-cells>${"<i></i>".repeat(MAX_CELLS)}</div><div class="tx-row tx-spread"><span>calls a page</span><b data-calls></b></div>`;
        case "histogram": {
          const ticks = [1, 10, 100, 1000]
            .map((ms) => {
              const x = xOf(ms).toFixed(1);
              const label = ms === 1000 ? "1,000 ms" : `${ms} ms`;
              return `<line class="tx-h-tick" x1="${x}" x2="${x}" y1="${PAD.top + plotH}" y2="${PAD.top + plotH + 4}"/><text class="tx-h-axis" x="${x}" y="${svgH - 4}" text-anchor="${ms === 1000 ? "end" : "middle"}">${label}</text>`;
            })
            .join("");
          const bars = (["fast", "mid", "slow"] as const)
            .map((t) => `<rect class="tx-h-bar ${t}" data-bar="${t}" x="0" y="0" width="22" height="0" rx="3"/><text class="tx-h-share ${t}" data-bar-label="${t}" text-anchor="start"></text>`)
            .join("");
          const markers = (Object.keys(MARKER_ROWS) as Marker[])
            .map((m) => `<line class="tx-h-mark ${m}" data-marker="${m}" x1="0" x2="0" y1="${PAD.top - 2}" y2="${PAD.top + plotH}"/><text class="tx-h-mlabel ${m}" data-marker-label="${m}" text-anchor="middle" y="${13 + MARKER_ROWS[m] * ROW_H}"></text>`)
            .join("");
          const dots = `<circle class="tx-h-dot" data-dot r="3.2" cx="0" cy="0" opacity="0"/>`.repeat(DOTS);
          return `${nodeHead(n)}<svg class="tx-hist" data-hist viewBox="0 0 ${svgW} ${svgH}" width="${svgW}" height="${svgH}" aria-hidden="true"><line class="tx-h-axisline" x1="${PAD.left}" x2="${PAD.left + plotW}" y1="${PAD.top + plotH}" y2="${PAD.top + plotH}"/>${ticks}${bars}${markers}${dots}</svg>`;
        }
        default:
          return nodeHead(n);
      }
    },

    mount(world: HTMLElement) {
      for (const el of world.querySelectorAll<HTMLElement>("[data-node]")) els.nodes[el.dataset.node!] = el;
      els.cells = [...world.querySelectorAll<HTMLElement>("[data-cells] i")];
      els.calls = world.querySelector<HTMLElement>("[data-calls]");
      for (const t of ["fast", "mid", "slow"] as const) {
        const bar = world.querySelector<SVGElement>(`[data-bar="${t}"]`);
        const label = world.querySelector<SVGElement>(`[data-bar-label="${t}"]`);
        els.bars[t] = bar && label ? { bar, label } : null;
      }
      for (const m of Object.keys(MARKER_ROWS) as Marker[]) {
        const line = world.querySelector<SVGElement>(`[data-marker="${m}"]`);
        const label = world.querySelector<SVGElement>(`[data-marker-label="${m}"]`);
        els.markers[m] = line && label ? { line, label } : null;
      }
      els.dots = [...world.querySelectorAll<SVGElement>("[data-dot]")];
    },

    paintWidgets(display: Outputs, ctx: StepContext) {
      // Services: one cell per call, up to MAX_CELLS.
      const calls = Math.max(1, Math.round(display.calls ?? 1));
      els.cells.forEach((el, i) => {
        const c = state.cells[i]!;
        const cls = i >= calls ? "off" : c.t > 0 ? c.tone : "";
        if (el.className !== cls) el.className = cls;
      });
      text(els.calls, calls > MAX_CELLS ? `×${formatOutput("calls", calls)}` : formatOutput("calls", calls));

      // Histogram bars, from the model's page shares.
      const shares: Record<Tone, [number, number]> = {
        fast: [display.fastMs ?? 0, display.pageFastPct ?? 0],
        mid: [display.hedgeReplyMs ?? 0, display.pageMidPct ?? 0],
        slow: [display.slowMs ?? 0, display.pageSlowPct ?? 0],
      };
      for (const t of ["fast", "mid", "slow"] as const) {
        const el = els.bars[t];
        if (!el) continue;
        const [ms, share] = shares[t];
        const show = share >= 0.005;
        const h = show ? Math.max(2, barHeight(share, plotH)) : 0;
        const x = xOf(ms);
        set(el.bar, { x: (x - 11).toFixed(1), y: (PAD.top + plotH - h).toFixed(1), height: h.toFixed(1), opacity: show ? 1 : 0 });
        // The share sits beside the bar's top, clear of the marker labels above the plot.
        set(el.label, { x: (x + 15).toFixed(1), y: (PAD.top + plotH - h + 11).toFixed(1), opacity: show ? 1 : 0 });
        text(el.label, show ? formatOutput("pageFastPct", share) : "");
      }

      // Markers, labelled from the model; each label on its own row, kept inside the panel.
      const marks: Record<Marker, [string, number]> = {
        avg: [pageMode(ctx) ? "page avg" : "avg", display.pageMeanMs ?? 0],
        p50: ["p50", display.pageP50Ms ?? 0],
        p99: ["p99", display.pageP99Ms ?? 0],
      };
      for (const m of Object.keys(MARKER_ROWS) as Marker[]) {
        const el = els.markers[m];
        if (!el) continue;
        const [name, ms] = marks[m];
        const x = xOf(ms);
        set(el.line, { x1: x.toFixed(1), x2: x.toFixed(1) });
        set(el.label, { x: Math.max(PAD.left + 34, Math.min(svgW - 40, x)).toFixed(1) });
        text(el.label, `${name} ${formatOutput("pageMeanMs", ms)}`);
      }

      // Dots fall into place and fade.
      els.dots.forEach((el, i) => {
        const d = state.dots[i]!;
        if (d.life <= 0) {
          set(el, { opacity: 0 });
          return;
        }
        // A dot lands on top of its bar, so it shows against the panel, not the bar.
        const ease = 1 - Math.pow(1 - d.fall, 3);
        const t = tone(d.ms, display);
        const rest = PAD.top + plotH - Math.max(2, barHeight(shares[t][1], plotH)) - 5;
        const cy = PAD.top - 6 + ease * (rest - PAD.top + 6);
        const cls = `tx-h-dot ${t}`;
        if (el.getAttribute("class") !== cls) el.setAttribute("class", cls);
        set(el, { cx: (xOf(d.ms) + d.jitter).toFixed(1), cy: cy.toFixed(1), opacity: Math.min(1, d.life / 1.5).toFixed(2) });
      });

      for (const [id, el] of Object.entries(els.nodes)) el.style.setProperty("--ping", (state.pings[id] ?? 0).toFixed(2));
    },

    chartSample(live: Outputs): number {
      return Math.min(CHART.max, (live.meanMs ?? 0) * (1 + (rand() * 0.04 - 0.02)));
    },
  };
}
