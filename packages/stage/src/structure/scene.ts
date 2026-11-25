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

  function drawMap(id: string, snap: Extract<Snapshot, { kind: "map" }>) {
    let box = maps.get(id);
    if (!box) {
      box = el("div", "ts-map", main);
      box.dataset.id = id;
      el("span", "ts-name", box).textContent = id;
      el("table", "", box);
      maps.set(id, box);
    }
    const table = box.querySelector("table")!;
    box.querySelector(".ts-empty")?.remove();
    table.replaceChildren();
    if (!snap.entries.length) {
      el("span", "ts-empty", box).textContent = "empty";
      return;
    }
    const body = el("tbody", "", table as unknown as HTMLElement);
    snap.entries.forEach(([k, v], i) => {
      const tr = el("tr", snap.marks[i] ? `m-${snap.marks[i]}` : "", body);
      el("td", "", tr).textContent = k;
      el("td", "", tr).textContent = text(v);
    });
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
      for (const [id, snap] of Object.entries(frame.structs)) {
        if (snap.kind === "array") drawArray(id, snap, frame);
        else if (snap.kind === "grid") drawGrid(id, snap);
        else drawMap(id, snap);
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
    },
  };
}
