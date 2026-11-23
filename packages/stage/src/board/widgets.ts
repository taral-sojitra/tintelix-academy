import { testCond, type BoardWidget, type Outputs } from "@tintelix/schema";
import { fillOutputs } from "@tintelix/schema/format";
import { esc } from "../render/dom";
import { toBase62 } from "./base62";

type Custom = { html(key: string): string; paint(root: HTMLElement, d: Outputs, clock: number): void };

const pct = (v: number, max: number) => `${Math.round(Math.min(1, Math.max(0, (Number.isFinite(v) ? v : 0) / max)) * 100)}%`;
const group = (n: number) => Math.round(n).toLocaleString("en-US");

/** Two guests booking the last room, one phase a second over 4 s: without anything refusing, and with a lock on the room. */
const LK_NAIVE: [string[], string[], string[]] = [
  ["check: room free", "insert", "commit", "booked"],
  ["check: room free", "insert", "commit", "booked"],
  ["check, then insert", "check, then insert", "check, then insert", "room 412 sold twice"],
];
const LK_LOCKED: [string[], string[], string[]] = [
  ["lock room 412", "insert", "commit", "booked"],
  ["waits for the lock", "still waiting", "gets the lock", "check: taken → 409"],
  ["one at a time for this room", "one at a time for this room", "one at a time for this room", "B is offered another room"],
];

/** The retrieval funnel's stages and when each lights up within a 4 s cycle. */
const FUN_STAGES = ["passages", "compared", "in the prompt", "answer"];
const FUN_AT = [0.5, 1.2, 2, 3];
const FUN_CYCLE_SEC = 4;

/** A slice of the board around you, starting at rank 1,203. Your score rises 50 a second over a 5 s cycle. */
const ZS_OTHERS: [string, number][] = [["Asha", 9820], ["Ken", 9705], ["Lola", 9650], ["Omar", 9580], ["Priya", 9555]];
const ZS_FIRST_RANK = 1203;
const ZS_YOU_START = 9540;
const ZS_PER_SEC = 50;
const ZS_CYCLE_SEC = 5;

/** Three minutes of clicks as [click time, arrival time] in seconds after 12:00, played 20× fast over a 10 s cycle. One phone was offline. */
const WM_EVENTS: [number, number][] = [
  [5, 7], [18, 21], [33, 36], [47, 50], [58, 63], [66, 68], [79, 83], [92, 95], [104, 107], [40, 125], [131, 134], [150, 152], [167, 170],
];
const WM_SPAN = 180;
const WM_SPEEDUP = 20;
const WM_CYCLE_SEC = 10;

/** When each one-minute window closes: the first arrival that pushes the watermark past its end. */
const wmCloseTimes = (slack: number) =>
  [60, 120, 180].map((end) => {
    let latest = -Infinity;
    for (const [at, arrive] of [...WM_EVENTS].sort((a, b) => a[1] - b[1])) {
      latest = Math.max(latest, at);
      if (latest - slack >= end) return arrive;
    }
    return Infinity;
  });

/** One metric over time as 24 bars, oldest first. Rolled up: the oldest 12 average in fours (1 h), the next 8 in pairs (1 min), the last 4 stay raw. */
const RUP_HEIGHTS = Array.from({ length: 24 }, (_, n) => Math.round(42 + 22 * Math.sin(n * 0.9) + 12 * Math.sin(n * 0.37 + 1)));
const rupGroup = (n: number): [number, number, string] => (n < 12 ? [n - (n % 4), 4, "hr"] : n < 20 ? [n - (n % 2), 2, "mn"] : [n, 1, ""]);

/** Four partitions of a topic, 14 offsets each, filling at 2 records a second over a 6 s cycle; each starts at its own offset. */
const PT_BASES = [3, 2, 4, 1];
const PT_CELLS = 14;
const PT_CYCLE_SEC = 6;
const PT_PER_SEC = 2;
/** How far the second group (replaying older records) trails the head. */
const PT_LAG = 6;

/** Disks holding one object's copies or pieces (up to 18); one more disk dies each second of a 5 s cycle, up to what the scheme survives. */
const EC_SLOTS = 18;
const EC_CYCLE_SEC = 5;
const EC_KILL_ORDER = [1, 6, 11, 3, 8, 13, 16, 0, 5, 10];

/** A file as 12 chunks with bytes inserted into the 4th: which chunks each way of cutting has to resend. Shown 1–3 s of a 3 s cycle. */
const BS_CHUNKS = 12;
const BS_ROWS: [string, number[]][] = [
  ["fixed", [3, 4, 5, 6, 7, 8, 9, 10, 11]],
  ["by content", [3, 4]],
];
const BS_CYCLE_SEC = 3;
const BS_SHOW_SEC = 1;

/** A video as 12 segments (of many) by 4 of its qualities. Each cell finishes at its own moment in a 2.5 s burst; the cycle is 4 s. */
const TC_QUALITIES = ["240p", "720p", "1080p", "4K"];
const TC_SEGMENTS = 12;
const TC_CYCLE_SEC = 4;
const tcDoneAt = (col: number, row: number) => 0.3 + ((col * 5 + row * 3) % TC_SEGMENTS) * 0.2;

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
  /** Two guests racing for the last room: check-then-insert sells it twice; a lock (or a constraint) makes the second one lose cleanly. */
  locking: {
    html: (key) =>
      `<div class="tx-lk" data-w="${key}">${["guest A", "guest B"].map((g) => `<div class="tx-lk-row"><em>${g}</em><b></b></div>`).join("")}<p class="tx-calc-s tx-lk-cap"></p></div>`,
    paint(root, d, clock) {
      const locked = (d.locked ?? 0) > 0;
      const [a, b, cap] = locked ? LK_LOCKED : LK_NAIVE;
      const phase = Math.floor(Math.max(0, clock) % 4);
      root.querySelectorAll<HTMLElement>(".tx-lk-row").forEach((row, n) => {
        const text = (n === 0 ? a : b)[phase]!;
        const el = row.querySelector("b")!;
        if (el.textContent !== text) el.textContent = text;
        row.classList.toggle("wait", locked && n === 1 && phase < 2);
      });
      root.classList.toggle("bad", !locked && phase === 3);
      const c = root.querySelector(".tx-lk-cap")!;
      if (c.textContent !== cap[phase]) c.textContent = cap[phase]!;
    },
  },
  /** Retrieval as a funnel: every passage, the few thousand the index compares, the handful in the prompt, one answer. */
  funnel: {
    html: (key) =>
      `<div class="tx-fun" data-w="${key}">${FUN_STAGES.map((label) => `<div class="tx-fun-row"><em>${esc(label)}</em><span><i></i></span><b></b></div>`).join("")}<p class="tx-calc-s tx-fun-cap"></p></div>`,
    paint(root, d, clock) {
      const values = [d.chunks ?? 0, d.annVisited ?? 0, d.topK ?? 0, 1];
      const top = Math.log10(Math.max(1, values[0]!)) + 1;
      const t = Math.max(0, clock) % FUN_CYCLE_SEC;
      root.querySelectorAll<HTMLElement>(".tx-fun-row").forEach((row, n) => {
        const v = values[n]!;
        row.classList.toggle("on", t >= FUN_AT[n]!);
        const width = `${+Math.min(100, ((Math.log10(Math.max(1, v)) + 1) / top) * 100).toFixed(1)}%`;
        const bar = row.querySelector<HTMLElement>("span i")!;
        if (bar.style.width !== width) bar.style.width = width;
        const b = row.querySelector("b")!;
        const text = group(v);
        if (b.textContent !== text) b.textContent = text;
      });
      const text = `the model reads ${group(values[2]!)} passages, not ${group(values[0]!)}`;
      const cap = root.querySelector(".tx-fun-cap")!;
      if (cap.textContent !== text) cap.textContent = text;
    },
  },
  /** A sorted set: players kept in score order, so your rank and neighbours are a lookup, not a count. */
  sortedset: {
    html: (key) =>
      `<div class="tx-zs" data-w="${key}">${"<div class=\"tx-zs-row\"><b></b><em></em><span></span></div>".repeat(ZS_OTHERS.length + 1)}<p class="tx-calc-s tx-zs-cap"></p></div>`,
    paint(root, d, clock) {
      const you = ZS_YOU_START + Math.floor((Math.max(0, clock) % ZS_CYCLE_SEC)) * ZS_PER_SEC;
      const board: [string, number, boolean][] = [...ZS_OTHERS.map(([n, s]): [string, number, boolean] => [n, s, false]), ["you", you, true]];
      board.sort((a, b) => b[1] - a[1]);
      root.querySelectorAll<HTMLElement>(".tx-zs-row").forEach((row, n) => {
        const [name, score, me] = board[n]!;
        row.classList.toggle("me", me);
        const set = (sel: string, text: string) => {
          const el = row.querySelector(sel)!;
          if (el.textContent !== text) el.textContent = text;
        };
        set("b", `#${group(ZS_FIRST_RANK + n)}`);
        set("em", name);
        set("span", group(score));
      });
      const text = `your rank found in ${Math.round(d.logSteps ?? 23)} steps`;
      const cap = root.querySelector(".tx-zs-cap")!;
      if (cap.textContent !== text) cap.textContent = text;
    },
  },
  /** Clicks placed by when they happened, minute windows that close once the watermark passes, and a click too late to count. */
  watermark: {
    html: (key) =>
      `<div class="tx-wm" data-w="${key}"><div class="tx-wm-axis">${["12:00", "12:01", "12:02"].map((t) => `<div class="tx-wm-win"><em>${t}</em><b></b></div>`).join("")}${WM_EVENTS.map(([at]) => `<i style="left:${+((at / WM_SPAN) * 100).toFixed(1)}%"></i>`).join("")}<s class="tx-wm-line"></s></div><p class="tx-calc-s tx-wm-cap"></p></div>`,
    paint(root, d, clock) {
      const slack = Math.max(0, d.slackSec ?? 30);
      const now = Math.min(WM_SPAN, (Math.max(0, clock) % WM_CYCLE_SEC) * WM_SPEEDUP);
      const closes = wmCloseTimes(slack);
      const seen = WM_EVENTS.filter(([, arrive]) => arrive <= now);
      const watermark = Math.max(0, Math.max(-Infinity, ...seen.map(([at]) => at)) - slack);
      const line = root.querySelector<HTMLElement>(".tx-wm-line")!;
      const left = `${+((Math.min(WM_SPAN, watermark) / WM_SPAN) * 100).toFixed(1)}%`;
      if (line.style.left !== left) line.style.left = left;
      let late = 0;
      root.querySelectorAll<HTMLElement>(".tx-wm-axis i").forEach((dot, n) => {
        const [at, arrive] = WM_EVENTS[n]!;
        dot.hidden = arrive > now;
        const tooLate = arrive <= now && arrive > closes[Math.floor(at / 60)]!;
        if (tooLate) late++;
        dot.className = tooLate ? "late" : "";
      });
      root.querySelectorAll<HTMLElement>(".tx-wm-win").forEach((win, w) => {
        const closed = closes[w]! <= now;
        win.classList.toggle("closed", closed);
        const count = WM_EVENTS.filter(([at, arrive]) => Math.floor(at / 60) === w && arrive <= closes[w]!).length;
        const text = closed ? String(count) : "open";
        const b = win.querySelector("b")!;
        if (b.textContent !== text) b.textContent = text;
      });
      const text = late > 0 ? `${late} too late → correction path` : `watermark = latest click − ${Math.round(slack)} s`;
      const cap = root.querySelector(".tx-wm-cap")!;
      if (cap.textContent !== text) cap.textContent = text;
    },
  },
  /** One metric's history: every raw point, or older points averaged into coarser rollups. */
  rollup: {
    html: (key) => `<div class="tx-rup" data-w="${key}"><div class="tx-rup-bars">${"<i></i>".repeat(RUP_HEIGHTS.length)}</div><p class="tx-calc-s tx-rup-cap"></p></div>`,
    paint(root, d) {
      const rolled = (d.rollups ?? 0) > 0;
      root.querySelectorAll<HTMLElement>(".tx-rup-bars i").forEach((bar, n) => {
        const [start, size, cls] = rolled ? rupGroup(n) : [n, 1, ""];
        const avg = RUP_HEIGHTS.slice(start, start + size).reduce((a, b) => a + b, 0) / size;
        const height = `${+avg.toFixed(1)}%`;
        if (bar.style.height !== height) bar.style.height = height;
        bar.className = cls;
      });
      const text = rolled ? "old: 1 h · then 1 min · recent: 15 s" : "every 15 s point, kept forever";
      const cap = root.querySelector(".tx-rup-cap")!;
      if (cap.textContent !== text) cap.textContent = text;
    },
  },
  /** A topic's partitions as append-only logs: records written so far, and where each consumer group has committed. */
  partitions: {
    html: (key) =>
      `<div class="tx-pt" data-w="${key}">${PT_BASES.map((_, r) => `<div class="tx-pt-row"><em>P${r}</em><span>${"<i></i>".repeat(PT_CELLS)}</span></div>`).join("")}<p class="tx-calc-s tx-pt-cap"></p></div>`,
    paint(root, d, clock) {
      const t = Math.max(0, clock) % PT_CYCLE_SEC;
      const two = (d.groups ?? 1) >= 2;
      root.querySelectorAll<HTMLElement>(".tx-pt-row").forEach((row, r) => {
        const head = Math.min(PT_CELLS - 1, PT_BASES[r]! + Math.floor(t * PT_PER_SEC));
        const ga = head - 1;
        const gb = two ? Math.max(0, head - PT_LAG) : -1;
        row.querySelectorAll("i").forEach((cell, n) => {
          cell.classList.toggle("on", n <= head);
          cell.classList.toggle("ga", n === ga);
          cell.classList.toggle("gb", n === gb);
        });
      });
      const key = two ? "two" : "one";
      const cap = root.querySelector<HTMLElement>(".tx-pt-cap")!;
      if (cap.dataset.k !== key) {
        cap.dataset.k = key;
        cap.innerHTML = two
          ? '<span class="a">●</span> billing · <span class="b">●</span> analytics, replaying'
          : 'a reader\'s committed offset <span class="a">●</span>';
      }
    },
  },
  /** One object on separate disks (one copy, three copies, or data + parity pieces) as disks die one by one. */
  erasure: {
    html: (key) => `<div class="tx-ec" data-w="${key}"><div class="tx-ec-disks">${"<i></i>".repeat(EC_SLOTS)}</div><p class="tx-calc-s tx-ec-cap"></p></div>`,
    paint(root, d, clock) {
      const pieces = Math.min(EC_SLOTS, Math.max(1, Math.round(d.pieces ?? 1)));
      const dataPieces = Math.min(pieces, Math.max(1, Math.round(d.dataPieces ?? 1)));
      const tolerance = Math.max(0, Math.round(d.tolerance ?? 0));
      const erasure = (d.erasure ?? 0) > 0;
      const kills = Math.min(Math.max(1, tolerance), pieces, Math.floor(Math.max(0, clock) % EC_CYCLE_SEC));
      const order = EC_KILL_ORDER.filter((n) => n < pieces).concat([...Array(pieces).keys()].filter((n) => !EC_KILL_ORDER.includes(n)));
      const dead = new Set(order.slice(0, kills));
      root.querySelectorAll<HTMLElement>(".tx-ec-disks i").forEach((cell, n) => {
        cell.hidden = n >= pieces;
        cell.classList.toggle("par", erasure && n >= dataPieces && n < pieces);
        cell.classList.toggle("dead", dead.has(n));
      });
      const left = pieces - kills;
      const lost = kills > tolerance;
      root.classList.toggle("lost", lost);
      let text: string;
      if (kills === 0) text = erasure ? `${dataPieces} data + ${pieces - dataPieces} parity, on ${pieces} disks` : pieces === 1 ? "1 copy, on 1 disk" : `${pieces} copies, on ${pieces} disks`;
      else if (lost) text = pieces === 1 ? "the only copy is gone" : "too many lost · object gone";
      else text = erasure ? `${left} of ${pieces} left · any ${dataPieces} rebuild it` : `${left} of ${pieces} copies left · copying again`;
      const cap = root.querySelector(".tx-ec-cap")!;
      if (cap.textContent !== text) cap.textContent = text;
    },
  },
  /** Bytes inserted near the start of a file: fixed-size chunks shift and resend the rest; content-defined chunks resend two. */
  blocksync: {
    html: (key) =>
      `<div class="tx-bs" data-w="${key}">${BS_ROWS.map(([label]) => `<div class="tx-bs-row"><em>${esc(label)}</em><span>${"<i></i>".repeat(BS_CHUNKS)}</span><b></b></div>`).join("")}</div>`,
    paint(root, d, clock) {
      const shown = Math.max(0, clock) % BS_CYCLE_SEC >= BS_SHOW_SEC;
      const active = (d.contentDefined ?? 0) > 0 ? 1 : 0;
      root.querySelectorAll<HTMLElement>(".tx-bs-row").forEach((row, r) => {
        const changed = BS_ROWS[r]![1];
        row.classList.toggle("on", r === active);
        row.querySelectorAll("i").forEach((cell, c) => cell.classList.toggle("chg", shown && changed.includes(c)));
        const text = shown ? `${changed.length} of ${BS_CHUNKS} resent` : "";
        const b = row.querySelector("b")!;
        if (b.textContent !== text) b.textContent = text;
      });
    },
  },
  /** Encoding a new video: every segment at every quality runs at once on a pool of encoders, then it can play. */
  transcode: {
    html: (key) =>
      `<div class="tx-tc" data-w="${key}">${TC_QUALITIES.map((q) => `<div class="tx-tc-row"><em>${esc(q)}</em><span>${"<i></i>".repeat(TC_SEGMENTS)}</span></div>`).join("")}<p class="tx-calc-s tx-tc-cap"></p></div>`,
    paint(root, d, clock) {
      const t = Math.max(0, clock) % TC_CYCLE_SEC;
      let left = 0;
      root.querySelectorAll<HTMLElement>(".tx-tc-row").forEach((row, r) => {
        row.querySelectorAll("i").forEach((cell, c) => {
          const done = t >= tcDoneAt(c, r);
          cell.classList.toggle("done", done);
          if (!done) left++;
        });
      });
      const ready = left === 0;
      root.classList.toggle("ready", ready);
      const text = ready ? fillOutputs("ready to play in {parallelSec}", d) : `${group(d.segments ?? 0)} segments, all encoding at once`;
      const cap = root.querySelector(".tx-tc-cap")!;
      if (cap.textContent !== text) cap.textContent = text;
    },
  },
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
