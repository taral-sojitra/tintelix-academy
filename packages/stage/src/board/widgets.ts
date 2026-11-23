import { testCond, type BoardWidget, type Outputs } from "@tintelix/schema";
import { fillOutputs } from "@tintelix/schema/format";
import { esc } from "../render/dom";
import { toBase62 } from "./base62";

type Custom = { html(key: string): string; paint(root: HTMLElement, d: Outputs, clock: number): void };

const pct = (v: number, max: number) => `${Math.round(Math.min(1, Math.max(0, (Number.isFinite(v) ? v : 0) / max)) * 100)}%`;
const group = (n: number) => Math.round(n).toLocaleString("en-US");

/** A small road graph: a grid of intersections, home at the left, the destination at the right. A search plays 3 s, then holds 1 s. */
const RG_COLS = 14;
const RG_ROWS = 5;
const RG_START: [number, number] = [0, 2];
const RG_GOAL: [number, number] = [13, 2];
const RG_GROW_SEC = 3;
const RG_CYCLE_SEC = 4;
const rgDist = (a: [number, number], b: [number, number]) => Math.hypot(a[0] - b[0], a[1] - b[1]);
/** With shortcuts: local streets around each end, plus every third intersection along the highway between. */
const rgShortcut = (p: [number, number]) => rgDist(p, RG_START) <= 1.5 || rgDist(p, RG_GOAL) <= 1.5 || (p[1] === RG_START[1] && p[0] % 3 === 0);

/** Free drivers near the rider, best first: driver number and minutes away. One phase of the match plays every 1.5 s. */
const DISPATCH: [string, number][] = [["37", 2], ["51", 3], ["8", 5]];
const DISPATCH_PHASE_SEC = 1.5;

/** Friends subscribed to your channel: name and distance in km (null = not sharing). One real second plays 10. */
const SUBSCRIBERS: [string, number | null][] = [["Meera", 1.2], ["Dev", 3.8], ["Kiran", 12], ["Ravi", null]];
const PUBSUB_SPEEDUP = 10;

/** The geohash picture shows an 8 km square drawn 150 px wide. */
const GEO_KM = 8;
const GEO_PX = 150;

/** Sample contacts: name and seconds since last seen (null = online now). */
const PRESENCE: [string, number | null][] = [["Ravi", null], ["Meera", null], ["Dev", 180], ["Kiran", 3700]];

/** The channels a broadcast fans out to: output prefix and label. One real second plays 20 broadcast seconds. */
const LANES: [string, string][] = [["push", "push"], ["email", "email"], ["sms", "SMS"]];
const LANE_SPEEDUP = 20;
const clockText = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;

/** Sample autocomplete: a prefix and the top five completions cached at its trie node. */
const TRIE_DEMO: [string, string[]][] = [
  ["c", ["cricket score", "chatgpt", "cheap flights", "cat videos", "calculator"]],
  ["ca", ["cat videos", "calculator", "cab near me", "canva", "calendar"]],
  ["cat", ["cat videos", "catfish", "catering", "category", "cat food"]],
];
const TRIE_STEP_SEC = 1.6;

/** Sample sites in the crawler's frontier: name, URLs waiting, and where in its wait it starts (0–1). */
const FRONTIER_HOSTS: [string, number, number][] = [["news.example", 5, 0], ["blog.example", 2, 0.25], ["shop.example", 3, 0.5], ["wiki.example", 1, 0.75]];

/** The seven steps of a design interview and the minutes each gets out of 45. */
const STEPS: [string, number][] = [["requirements", 5], ["estimates", 5], ["API", 5], ["data", 5], ["design", 10], ["deep dive", 10], ["bottlenecks", 5]];

/** Widgets a lesson needs that the shared kinds can't draw, by name. */
export const CUSTOM: Record<string, Custom> = {
  /** A route search on a small road graph: without shortcuts it spreads in a circle from home; with them it hops along the highway. */
  roadgraph: {
    html: (key) => {
      const dots = Array.from({ length: RG_COLS * RG_ROWS }, (_, n) => {
        const p: [number, number] = [n % RG_COLS, Math.floor(n / RG_COLS)];
        const cls = rgDist(p, RG_START) === 0 ? "start" : rgDist(p, RG_GOAL) === 0 ? "goal" : "";
        return `<i${cls ? ` class="${cls}"` : ""}></i>`;
      }).join("");
      return `<div class="tx-rg" data-w="${key}"><div class="tx-rg-map">${dots}</div><p class="tx-calc-s tx-rg-cap"></p></div>`;
    },
    paint(root, d, clock) {
      const fast = (d.shortcuts ?? 0) > 0;
      const t = Math.min(1, (Math.max(0, clock) % RG_CYCLE_SEC) / RG_GROW_SEC);
      const reach = t * (RG_COLS - 1);
      root.classList.toggle("fast", fast);
      root.querySelectorAll<HTMLElement>(".tx-rg-map i").forEach((dot, n) => {
        const p: [number, number] = [n % RG_COLS, Math.floor(n / RG_COLS)];
        const on = fast ? rgShortcut(p) && p[0] <= reach : rgDist(p, RG_START) <= reach;
        dot.classList.toggle("lit", on);
      });
      const text = `${fast ? "shortcuts" : "every road"} · ${group(d.explored ?? 0)} searched${t >= 1 ? " · found" : ""}`;
      const cap = root.querySelector(".tx-rg-cap")!;
      if (cap.textContent !== text) cap.textContent = text;
    },
  },
  /** One match: rank nearby free drivers, claim the best, then offer; with a race on, a second rider's claim on the same driver fails. */
  dispatch: {
    html: (key) =>
      `<div class="tx-disp" data-w="${key}"><p class="tx-calc-s tx-disp-cap"></p>${DISPATCH.map(([id, min]) => `<div class="tx-disp-row"><i></i><em>#${id} · ${min} min</em><b></b></div>`).join("")}</div>`,
    paint(root, d, clock) {
      const phase = Math.floor(Math.max(0, clock) / DISPATCH_PHASE_SEC) % 5;
      const race = (d.clashPct ?? 0) > 0;
      const [best, next] = [DISPATCH[0]![0], DISPATCH[1]![0]];
      const captions = [
        `rider 12: ${group(d.candidates ?? 0)} free in ${group(d.cellsChecked ?? 7)} cells`,
        `claiming ${best}: free → claimed`,
        `${best} claimed · no one else can`,
        race ? `rider 13 claims ${best} too · fails` : `offered to ${best} · 10 s to accept`,
        race ? `rider 13 takes ${next} instead` : `${best} accepted · trip on`,
      ];
      const cap = root.querySelector(".tx-disp-cap")!;
      if (cap.textContent !== captions[phase]) cap.textContent = captions[phase]!;
      const states: [string, string][] = DISPATCH.map(() => ["free", ""]);
      if (phase === 1) states[0] = ["claiming", "try"];
      if (phase >= 2) states[0] = ["claimed · rider 12", phase === 3 && race ? "mine clash" : "mine"];
      if (phase === 4 && race) states[1] = ["claimed · rider 13", "mine"];
      root.querySelectorAll<HTMLElement>(".tx-disp-row").forEach((row, i) => {
        const [text, cls] = states[i]!;
        row.className = cls ? `tx-disp-row ${cls}` : "tx-disp-row";
        const b = row.querySelector("b")!;
        if (b.textContent !== text) b.textContent = text;
      });
    },
  },
  /** One person's location channel: each update goes to subscribed friends, sent only if close enough. */
  pubsub: {
    html: (key) =>
      `<div class="tx-ps" data-w="${key}"><p class="tx-calc-s tx-ps-head"></p>${SUBSCRIBERS.map(([name]) => `<div class="tx-ps-row"><i></i><em>${esc(name)}</em><b></b></div>`).join("")}</div>`,
    paint(root, d, clock) {
      const every = Math.max(1, d.updateEvery ?? 20);
      const radius = d.radiusKm ?? 5;
      const n = Math.floor((Math.max(0, clock) * PUBSUB_SPEEDUP) / every) + 1;
      const head = root.querySelector(".tx-ps-head")!;
      const text = `your channel · update #${n}`;
      if (head.textContent !== text) head.textContent = text;
      root.querySelectorAll<HTMLElement>(".tx-ps-row").forEach((row, i) => {
        const [, km] = SUBSCRIBERS[i]!;
        const state = km === null ? "off" : km <= radius ? "near" : "far";
        row.className = `tx-ps-row ${state}`;
        row.querySelector("b")!.textContent = km === null ? "not sharing" : `${km} km · ${state === "near" ? "sent" : "too far"}`;
      });
    },
  },
  /** An 8 km square of map: geohash cells at the chosen length, the block of cells read, and the search circle. */
  geogrid: {
    html: (key) =>
      `<div class="tx-geo" data-w="${key}"><div class="tx-geo-map"><div class="tx-geo-read"></div><div class="tx-geo-ring"></div><i class="tx-geo-dot"></i></div><p class="tx-calc-s"></p></div>`,
    paint(root, d) {
      const px = (km: number) => (GEO_PX * km) / GEO_KM;
      const cw = px(d.cellW ?? 1);
      const ch = px(d.cellH ?? 1);
      const nx = Math.round(d.cellsX ?? 3);
      const ny = Math.round(d.cellsY ?? 3);
      const set = (el: HTMLElement, prop: "width" | "height" | "backgroundSize", v: string) => {
        if (el.style[prop] !== v) el.style[prop] = v;
      };
      const map = root.querySelector<HTMLElement>(".tx-geo-map")!;
      set(map, "backgroundSize", `${+cw.toFixed(1)}px ${+ch.toFixed(1)}px`);
      const read = root.querySelector<HTMLElement>(".tx-geo-read")!;
      set(read, "width", `${+Math.min(GEO_PX, nx * cw).toFixed(1)}px`);
      set(read, "height", `${+Math.min(GEO_PX, ny * ch).toFixed(1)}px`);
      const ring = root.querySelector<HTMLElement>(".tx-geo-ring")!;
      const dia = `${+px(2 * (d.radiusKm ?? 2)).toFixed(1)}px`;
      set(ring, "width", dia);
      set(ring, "height", dia);
      root.querySelector(".tx-calc-s")!.textContent = `length ${Math.round(d.geoLen ?? 6)}: ${nx} × ${ny} = ${group(nx * ny)} cells read`;
    },
  },
  /** A contact list: who is online now, and how long ago the others were last seen (counting up). */
  presence: {
    html: (key) =>
      `<div class="tx-pres" data-w="${key}">${PRESENCE.map(([name]) => `<div class="tx-pres-row"><i></i><em>${esc(name)}</em><b></b></div>`).join("")}</div>`,
    paint(root, _d, clock) {
      root.querySelectorAll<HTMLElement>(".tx-pres-row").forEach((row, i) => {
        const [, seenAgo] = PRESENCE[i]!;
        const online = seenAgo === null;
        row.classList.toggle("on", online);
        let text = "online";
        if (!online) {
          const ago = seenAgo + Math.max(0, clock);
          text = ago >= 3600 ? `last seen ${Math.floor(ago / 3600)} h ago` : `last seen ${Math.max(1, Math.floor(ago / 60))} min ago`;
        }
        const b = row.querySelector("b")!;
        if (b.textContent !== text) b.textContent = text;
      });
    },
  },
  /** A broadcast playing out per channel: how much of each has gone, and when each will be done. */
  lanes: {
    html: (key) =>
      `<div class="tx-chl" data-w="${key}"><p class="tx-calc-s tx-chl-t"></p><div class="tx-chl-rows">${LANES.map(([, label]) => `<div class="tx-chl-row"><em>${esc(label)}</em><span class="tx-chl-bar"><i></i></span><b></b></div>`).join("")}</div></div>`,
    paint(root, d, clock) {
      const t = Math.max(0, clock) * LANE_SPEEDUP;
      root.querySelector(".tx-chl-t")!.textContent = `T+${clockText(t)}`;
      root.querySelectorAll<HTMLElement>(".tx-chl-row").forEach((row, i) => {
        const [name] = LANES[i]!;
        const count = d[`${name}Count`] ?? 0;
        const rate = d[`${name}Eff`] ?? 0;
        const done = rate > 0 ? count / rate : Infinity;
        const pct = count > 0 ? Math.min(100, Math.round(((rate * t) / count) * 100)) : 100;
        row.querySelector<HTMLElement>(".tx-chl-bar i")!.style.width = `${pct}%`;
        row.querySelector("b")!.textContent = `${pct}% · all by ${Number.isFinite(done) ? clockText(done) : "never"}`;
      });
    },
  },
  /** A trie lookup as someone types: the prefix so far and the top five completions stored at its node. */
  trie: {
    html: (key) => `<div class="tx-trie" data-w="${key}"><p class="tx-calc-s">typed: <span class="tx-trie-typed"></span></p><ol>${"<li></li>".repeat(5)}</ol></div>`,
    paint(root, _d, clock) {
      const [prefix, top] = TRIE_DEMO[Math.floor(Math.max(0, clock) / TRIE_STEP_SEC) % TRIE_DEMO.length]!;
      const typed = root.querySelector(".tx-trie-typed")!;
      if (typed.textContent !== prefix) {
        typed.textContent = prefix;
        root.querySelectorAll("li").forEach((li, i) => (li.textContent = top[i] ?? ""));
      }
    },
  },
  /** A crawler's per-host queues: how many URLs each site has waiting and when it may be fetched next. */
  frontier: {
    html: (key) =>
      `<div class="tx-hq" data-w="${key}">${FRONTIER_HOSTS.map(([host]) => `<div class="tx-hq-row"><em>${esc(host)}</em><span>${"<i></i>".repeat(5)}</span><b></b></div>`).join("")}</div>`,
    paint(root, d, clock) {
      const delay = Math.max(0.1, d.politeDelay ?? 1);
      root.querySelectorAll<HTMLElement>(".tx-hq-row").forEach((row, i) => {
        const [, n, offset] = FRONTIER_HOSTS[i]!;
        row.querySelectorAll("i").forEach((c, k) => c.classList.toggle("on", k < n));
        const wait = (delay - ((Math.max(0, clock) + offset * delay) % delay)) % delay;
        row.querySelector("b")!.textContent = wait < 0.05 ? "ready" : `in ${wait.toFixed(1)} s`;
      });
    },
  },
  /** N replica slots, with the W a write waits for and the R a read asks, and whether they must overlap. */
  quorum: {
    html: (key) =>
      `<div class="tx-nwr" data-w="${key}"><div class="tx-nwr-row" data-q="write"><em>write</em><span></span></div><div class="tx-nwr-row" data-q="read"><em>read</em><span></span></div><p class="tx-calc-s"></p></div>`,
    paint(root, d) {
      const n = Math.max(1, Math.round(d.replicas ?? 3));
      const w = Math.min(n, Math.max(1, Math.round(d.writeQuorum ?? 1)));
      const r = Math.min(n, Math.max(1, Math.round(d.readQuorum ?? 1)));
      const down = Math.round(d.downReplica ?? 0);
      const alive = [...Array(n).keys()].map((i) => i + 1).filter((i) => i !== down);
      const writes = new Set(alive.slice(0, w));
      const reads = new Set(alive.slice(-r));
      for (const [name, set] of [["write", writes], ["read", reads]] as const) {
        const cells = root.querySelector(`[data-q="${name}"] span`)!;
        if (cells.children.length !== n) cells.innerHTML = "<i></i>".repeat(n);
        [...cells.children].forEach((c, i) => {
          c.classList.toggle("down", i + 1 === down);
          c.classList.toggle("on", set.has(i + 1));
        });
      }
      root.querySelector(".tx-calc-s")!.textContent =
        alive.length < w
          ? `Only ${alive.length} of ${n} replicas up: writes need ${w}`
          : w + r > n
            ? `W ${w} + R ${r} > N ${n}: every read meets the latest write`
            : `W ${w} + R ${r} ≤ N ${n}: a read can miss the latest write`;
    },
  },
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
