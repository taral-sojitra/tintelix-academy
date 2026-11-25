import type { Frame, Snapshot, Value } from "@tintelix/schema";

export interface StructureScene {
  /** Draws a frame. Elements are kept by key, so what moved animates instead of being redrawn. */
  render(frame: Frame, opts?: { counter?: string }): void;
  destroy(): void;
}

const text = (v: Value) => (v === null ? "—" : String(v));

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, parent?: HTMLElement): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.className = cls;
  parent?.appendChild(e);
  return e;
}

/**
 * The DSA stage: each structure in a frame drawn as plain HTML (framework-free, like the system scene's
 * boxes), pointers under their cells, and a data panel with the variables and the step counter.
 */
export function createStructureScene(root: HTMLElement): StructureScene {
  root.classList.add("tx-struct");
  const main = el("div", "ts-main", root);
  const side = el("div", "ts-side", root);
  const arrays = new Map<string, { box: HTMLElement; row: HTMLElement; ptrs: HTMLElement }>();

  const grids = new Map<string, HTMLElement>();

  function drawGrid(id: string, snap: Extract<Snapshot, { kind: "grid" }>) {
    let box = grids.get(id);
    if (!box) {
      box = el("div", "ts-grid", main);
      box.dataset.id = id;
      el("span", "ts-name", box).textContent = id;
      el("table", "", box);
      grids.set(id, box);
    }
    const cols = snap.rows[0]?.length ?? 0;
    const table = box.querySelector("table")!;
    const head = `<thead><tr><th></th>${Array.from({ length: cols }, (_, c) => `<th>${c}</th>`).join("")}</tr></thead>`;
    const body = snap.rows
      .map((row, r) => `<tr><th>${r}</th>${row.map((v, c) => `<td${snap.marks[r]?.[c] ? ` class="m-${snap.marks[r]![c]}"` : ""}>${v === null ? "" : String(v).replace(/[&<>]/g, "")}</td>`).join("")}</tr>`)
      .join("");
    table.innerHTML = head + `<tbody>${body}</tbody>`;
  }

  const maps = new Map<string, HTMLElement>();

  /** Call stacks and trees: redrawn whole each frame. */
  const boxes = new Map<string, { kind: string; box: HTMLElement }>();
  const box = (id: string, kind: string, cls: string) => {
    const had = boxes.get(id);
    if (had?.kind === kind) return had.box;
    had?.box.remove();
    const b = el("div", cls, main);
    b.dataset.id = id;
    boxes.set(id, { kind, box: b });
    return b;
  };

  /** The newest cards shown; the rest are counted. */
  const CALLS_SHOWN = 6;

  function drawCalls(id: string, snap: Extract<Snapshot, { kind: "calls" }>) {
    const b = box(id, "calls", "ts-calls");
    b.replaceChildren();
    el("span", "ts-name", b).textContent = "call stack";
    const ol = el("ol", "", b);
    const newest = snap.frames.slice(-CALLS_SHOWN).reverse();
    newest.forEach((f, i) => {
      const li = el("li", i === 0 ? "top" : "", ol);
      el("span", "", li).textContent = `${f.fn}(${f.args})`;
      if (f.ret !== undefined) el("b", "", li).textContent = `= ${text(f.ret)}`;
    });
    const rest = snap.frames.length - newest.length;
    if (rest > 0) el("li", "more", ol).textContent = `${rest} more call${rest === 1 ? "" : "s"} below`;
    if (!snap.frames.length) el("li", "ts-empty", ol).textContent = "empty";
  }

  /** Tree layout, in SVG units: a slot per leaf, a level per depth. */
  const SLOT = 64;
  const LEVEL = 72;

  function drawTree(id: string, snap: Extract<Snapshot, { kind: "tree" }>) {
    const b = box(id, "tree", "ts-tree");
    b.replaceChildren();
    el("span", "ts-name", b).textContent = id;
    const nodes = new Map(snap.nodes.map((n) => [n.id, n]));
    const pos = new Map<string, { x: number; y: number }>();
    let next = 0;
    let depth = 0;
    // Leaves take the next slot left to right; a parent sits midway over its first and last child.
    // A binary node with one child keeps an empty slot for the missing side, so left stays left.
    const place = (nid: string | null, d: number): number => {
      depth = Math.max(depth, d);
      const n = nid === null ? undefined : nodes.get(nid);
      if (!n) return next++;
      const kids = n.children ?? (n.left || n.right ? [n.left ?? null, n.right ?? null] : []);
      const x = kids.length ? (() => {
        const xs = kids.map((k) => place(k, d + 1));
        return (xs[0]! + xs.at(-1)!) / 2;
      })() : next++;
      pos.set(n.id, { x, y: d });
      return x;
    };
    if (snap.root !== null && nodes.has(snap.root)) place(snap.root, 0);
    if (!pos.size) {
      el("span", "ts-empty", b).textContent = "empty";
      return;
    }
    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    const w = Math.max(next, 1) * SLOT;
    const h = (depth + 1) * LEVEL;
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svg.style.setProperty("--w", String(w));
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", `${id}: ${pos.size} node${pos.size === 1 ? "" : "s"}`);
    const at = (p: { x: number; y: number }) => ({ cx: p.x * SLOT + SLOT / 2, cy: p.y * LEVEL + 24 });
    for (const n of snap.nodes) {
      const from = pos.get(n.id);
      if (!from) continue;
      for (const k of n.children ?? [n.left ?? null, n.right ?? null]) {
        const to = k === null ? undefined : pos.get(k);
        if (!to) continue;
        const a = at(from);
        const c = at(to);
        const line = document.createElementNS(NS, "line");
        line.setAttribute("x1", String(a.cx));
        line.setAttribute("y1", String(a.cy + 15));
        line.setAttribute("x2", String(c.cx));
        line.setAttribute("y2", String(c.cy - 15));
        svg.append(line);
      }
    }
    for (const n of snap.nodes) {
      const p = pos.get(n.id);
      if (!p) continue;
      const { cx, cy } = at(p);
      const g = document.createElementNS(NS, "g");
      g.setAttribute("class", n.mark ? `ts-node m-${n.mark}` : "ts-node");
      g.setAttribute("data-x", String(p.x));
      const rect = document.createElementNS(NS, "rect");
      rect.setAttribute("x", String(cx - 26));
      rect.setAttribute("y", String(cy - 15));
      rect.setAttribute("width", "52");
      rect.setAttribute("height", "30");
      rect.setAttribute("rx", "8");
      const label = document.createElementNS(NS, "text");
      label.setAttribute("x", String(cx));
      label.setAttribute("y", String(cy + 5));
      label.textContent = n.label;
      g.append(rect, label);
      if (n.sub) {
        const sub = document.createElementNS(NS, "text");
        sub.setAttribute("class", "ts-sub");
        sub.setAttribute("x", String(cx));
        sub.setAttribute("y", String(cy + 32));
        sub.textContent = n.sub;
        g.append(sub);
      }
      svg.append(g);
    }
    b.append(svg);
  }

  /** List layout, in SVG units. */
  const STEP = 92;
  const BOX = { w: 52, h: 36, top: 30 };
  const arrowId = `ts-arrow-${Math.random().toString(36).slice(2, 8)}`;

  function drawList(id: string, snap: Extract<Snapshot, { kind: "list" }>) {
    const b = box(id, "list", "ts-list");
    b.replaceChildren();
    el("span", "ts-name", b).textContent = id;
    if (!snap.nodes.length) {
      el("span", "ts-empty", b).textContent = "empty";
      return;
    }
    const NS = "http://www.w3.org/2000/svg";
    const make = <K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>, parent: Element, textContent?: string) => {
      const e = document.createElementNS(NS, tag);
      for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
      if (textContent !== undefined) e.textContent = textContent;
      parent.append(e);
      return e;
    };
    const index = new Map(snap.nodes.map((n, i) => [n.id, i]));
    const left = (i: number) => 16 + i * STEP;
    const mid = BOX.top + BOX.h / 2;
    const tagsAt = new Map<string, string[]>();
    for (const t of snap.tags) tagsAt.set(t.at, [...(tagsAt.get(t.at) ?? []), t.name]);
    const rows = Math.max(0, ...[...tagsAt.values()].map((t) => t.length));
    const bot = BOX.top + BOX.h;
    const dipOf = (i: number, j: number) => bot + 18 + Math.min(i - j, 4) * 4;
    // Tags go below the deepest back-link arc, so the arc never runs through a label.
    let deepest = bot;
    snap.nodes.forEach((n, i) => {
      const j = n.next === null ? undefined : index.get(n.next);
      if (j !== undefined && j <= i) deepest = Math.max(deepest, dipOf(i, j) - 6);
    });
    const tagTop = deepest + 16;
    const w = 16 + snap.nodes.length * STEP;
    const h = tagTop + 8 + rows * 16;
    const svg = make("svg", { viewBox: `0 0 ${w} ${h}`, role: "img", "aria-label": `${id}: ${snap.nodes.length} node${snap.nodes.length === 1 ? "" : "s"}` }, b);
    svg.style.setProperty("--w", String(w));
    const marker = make("marker", { id: arrowId, viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" }, make("defs", {}, svg));
    make("path", { d: "M0,0 L10,5 L0,10 z" }, marker);
    snap.nodes.forEach((n, i) => {
      const x = left(i);
      if (n.next === null) {
        make("text", { class: "nil", x: x + BOX.w + 14, y: mid + 5 }, svg, "∅");
        return;
      }
      const j = index.get(n.next);
      if (j === undefined) return;
      let d: string;
      let cls = "ts-link";
      if (j === i + 1) d = `M${x + BOX.w},${mid} L${left(j) - 2},${mid}`;
      else if (j > i) d = `M${x + BOX.w / 2},${BOX.top} C${x + BOX.w / 2},${BOX.top - 26} ${left(j) + BOX.w / 2},${BOX.top - 26} ${left(j) + BOX.w / 2},${BOX.top - 2}`;
      else {
        // Back to the same or an earlier node: an arc under the boxes.
        cls = "ts-link back";
        const dip = dipOf(i, j);
        d = `M${x + BOX.w / 2 + 6},${bot} C${x + BOX.w / 2 + 6},${dip} ${left(j) + BOX.w / 2 - 6},${dip} ${left(j) + BOX.w / 2 - 6},${bot + 2}`;
      }
      make("path", { class: cls, d, "marker-end": `url(#${arrowId})` }, svg);
    });
    snap.nodes.forEach((n, i) => {
      const g = make("g", { class: n.mark ? `ts-lnode m-${n.mark}` : "ts-lnode" }, svg);
      make("rect", { x: left(i), y: BOX.top, width: BOX.w, height: BOX.h, rx: 8 }, g);
      make("text", { class: "v", x: left(i) + BOX.w / 2, y: mid + 5 }, g, n.value === null ? "—" : String(n.value));
    });
    const hi = snap.head === null ? undefined : index.get(snap.head);
    if (hi !== undefined) make("text", { class: "ts-tag head", x: left(hi) + BOX.w / 2, y: BOX.top - 8 }, svg, "head");
    for (const [at, names] of tagsAt) {
      const i = index.get(at);
      if (i === undefined) continue;
      names.forEach((name, r) => make("text", { class: `ts-tag t${snap.tags.findIndex((t) => t.name === name) % 4}`, x: left(i) + BOX.w / 2, y: tagTop + r * 16 }, svg, name));
    }
  }

  /** Rows per column: longer maps wrap into side-by-side tables so the stage stays short. */
  const MAP_ROWS = 8;

  function drawMap(id: string, snap: Extract<Snapshot, { kind: "map" }>) {
    let box = maps.get(id);
    if (!box) {
      box = el("div", "ts-map", main);
      box.dataset.id = id;
      el("span", "ts-name", box).textContent = id;
      el("div", "ts-cols", box);
      maps.set(id, box);
    }
    const cols = box.querySelector<HTMLElement>(".ts-cols")!;
    cols.replaceChildren();
    if (!snap.entries.length) {
      el("span", "ts-empty", cols).textContent = "empty";
      return;
    }
    for (let start = 0; start < snap.entries.length; start += MAP_ROWS) {
      const body = el("tbody", "", el("table", "", cols));
      snap.entries.slice(start, start + MAP_ROWS).forEach(([k, v], i) => {
        const mark = snap.marks[start + i];
        const tr = el("tr", mark ? `m-${mark}` : "", body);
        el("td", "", tr).textContent = k;
        el("td", "", tr).textContent = text(v);
      });
    }
  }

  function drawArray(id: string, snap: Extract<Snapshot, { kind: "array" }>, frame: Frame) {
    let a = arrays.get(id);
    if (!a) {
      const box = el("div", "ts-array", main);
      box.dataset.id = id;
      el("span", "ts-name", box).textContent = id;
      a = { box, row: el("ol", "ts-row", box), ptrs: el("div", "ts-ptrs", box) };
      a.ptrs.setAttribute("aria-hidden", "true");
      arrays.set(id, a);
    }
    a.box.style.setProperty("--n", String(Math.max(snap.values.length, 1)));
    const cells = a.row.children;
    while (cells.length > snap.values.length) a.row.lastElementChild!.remove();
    if (!snap.values.length) {
      if (!a.row.querySelector(".ts-empty")) el("li", "ts-empty", a.row).textContent = "empty";
    } else a.row.querySelector(".ts-empty")?.remove();
    snap.values.forEach((v, i) => {
      let c = a.row.children[i] as HTMLElement | undefined;
      if (!c) {
        c = el("li", "ts-cell", a.row);
        c.dataset.i = String(i);
        el("i", "", c).textContent = String(i);
        el("b", "", c);
      }
      c.className = snap.marks[i] ? `ts-cell m-${snap.marks[i]}` : "ts-cell";
      c.querySelector("b")!.textContent = text(v);
    });
    const mine = frame.pointers.filter((p) => p.on === id);
    const keep = new Set(mine.map((p) => p.name));
    for (const p of [...a.ptrs.children] as HTMLElement[]) if (!keep.has(p.dataset.name!)) p.remove();
    const rows = new Map<number, number>();
    for (const p of mine) {
      let e = a.ptrs.querySelector<HTMLElement>(`.ts-ptr[data-name='${p.name}']`);
      if (!e) {
        e = el("span", "ts-ptr", a.ptrs);
        e.dataset.name = p.name;
        e.textContent = p.name;
      }
      const row = rows.get(p.at) ?? 0;
      rows.set(p.at, row + 1);
      e.style.setProperty("--at", String(p.at));
      e.style.setProperty("--row", String(row));
    }
  }

  return {
    render(frame, opts = {}) {
      const ids = new Set(Object.keys(frame.structs));
      for (const [id, a] of arrays)
        if (!ids.has(id)) {
          a.box.remove();
          arrays.delete(id);
        }
      for (const [id, g] of grids)
        if (!ids.has(id)) {
          g.remove();
          grids.delete(id);
        }
      for (const [id, m] of maps)
        if (!ids.has(id)) {
          m.remove();
          maps.delete(id);
        }
      for (const [id, b] of boxes)
        if (!ids.has(id)) {
          b.box.remove();
          boxes.delete(id);
        }
      for (const [id, snap] of Object.entries(frame.structs)) {
        if (snap.kind === "array") drawArray(id, snap, frame);
        else if (snap.kind === "grid") drawGrid(id, snap);
        else if (snap.kind === "map") drawMap(id, snap);
        else if (snap.kind === "calls") drawCalls(id, snap);
        else if (snap.kind === "list") drawList(id, snap);
        else drawTree(id, snap);
      }

      side.replaceChildren();
      const vars = Object.entries(frame.vars);
      if (vars.length) {
        const dl = el("dl", "ts-vars", side);
        for (const [k, v] of vars) {
          el("dt", "", dl).textContent = k;
          el("dd", "", dl).textContent = text(v);
        }
      }
      if (opts.counter) el("p", "ts-steps", side).textContent = `${opts.counter}: ${frame.steps}`;
    },
    destroy() {
      root.replaceChildren();
      root.classList.remove("tx-struct");
      arrays.clear();
      grids.clear();
      maps.clear();
      boxes.clear();
    },
  };
}
