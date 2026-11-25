import type { TGrid, Tracer } from "@tintelix/dsa";

type In = { nums: number[]; n: number };
const show = (xs: number[]) => (xs.length ? xs.join(" ") : "∅");

/** Every subset by include-or-skip forks: choose a number, explore, undo it, then explore without it. */
export function subsets(t: Tracer, { nums }: In) {
  const tree = t.tree("choices");
  const out: number[][] = [];
  const chosen: number[] = [];
  let ids = 0;
  t.set("chosen", "∅");
  t.set("found", 0);
  tree.node("root", "start");
  tree.mark("root", "active");
  t.at("start", nums.length ? `Fork on each of ${nums.length} numbers: take it or skip it` : "No numbers: the only subset is the empty one");
  const go = (i: number, parent: string) => {
    if (i === nums.length) {
      t.count();
      out.push([...chosen]);
      tree.sub(parent, show(chosen));
      tree.mark(parent, "found");
      t.set("found", out.length);
      t.at("leaf", `A leaf: record {${chosen.join(", ")}}`);
      return;
    }
    const x = nums[i]!;
    const take = `n${++ids}`;
    chosen.push(x);
    tree.node(take, `+${x}`, parent);
    tree.mark(take, "active");
    t.set("chosen", show(chosen));
    t.at("take", `Take ${x}: {${chosen.join(", ")}}`);
    go(i + 1, take);
    chosen.pop();
    const inner = i + 1 < nums.length; // a leaf keeps its "found" mark
    if (inner) tree.mark(take, "done");
    t.set("chosen", show(chosen));
    t.at("undo", `Undo: put ${x} back`);
    const skip = `n${++ids}`;
    tree.node(skip, `−${x}`, parent);
    tree.mark(skip, "active");
    t.at("skip", `Skip ${x}: {${chosen.join(", ")}}`);
    go(i + 1, skip);
    if (inner) tree.mark(skip, "done");
  };
  go(0, "root");
  if (nums.length) tree.mark("root", "done");
  t.at("done", `${out.length} subset${out.length === 1 ? "" : "s"}`);
  t.result(out);
}

/** Can a queen go at (r, c), given one queen in each row above? */
const safe = (cols: number[], r: number, c: number) => cols.every((qc, qr) => qr >= r || (qc !== c && Math.abs(qc - c) !== r - qr));
const paintBoard = (g: TGrid, n: number, cols: number[]) => {
  g.clearMarks();
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) g.put(r, c, cols[r] === c ? "Q" : null);
};

/** N queens the slow way: every board with one queen per row, in order, until one is safe. */
export function everyBoard(t: Tracer, { n }: In) {
  const g = t.grid("board", n, n);
  t.at("start", `Every board: ${n} queens, one per row, ${n ** n} ways to place them`);
  const cols = Array<number>(n).fill(0);
  for (;;) {
    t.count();
    paintBoard(g, n, cols);
    const clash = cols.findIndex((c, r) => !safe(cols, r, c));
    if (clash < 0) {
      for (let r = 0; r < n; r++) g.mark(r, cols[r]!, "found");
      t.at("board", `Board ${cols.join(" ")}: no queen attacks another`);
      t.at("solved", `Found after checking every board up to this one`);
      return t.result([...cols]);
    }
    g.mark(clash, cols[clash]!, "bad");
    t.at("board", `Board ${cols.join(" ")}: the queen in row ${clash} is attacked`);
    let r = n - 1;
    while (r >= 0 && cols[r] === n - 1) cols[r--] = 0;
    if (r < 0) break;
    cols[r]!++;
  }
  t.at("none", `No board works: ${n} queens can't fit`);
  t.result(null);
}

/** N queens by backtracking: place row by row; a square under attack is skipped; a row with no safe square undoes the queen above. */
export function backtrack(t: Tracer, { n }: In) {
  const g = t.grid("board", n, n);
  const cols: number[] = [];
  t.at("start", `Place ${n} queen${n === 1 ? "" : "s"}, one row at a time`);
  const go = (r: number): boolean => {
    if (r === n) return true;
    for (let c = 0; c < n; c++) {
      t.count();
      paintBoard(g, n, cols);
      if (!safe(cols, r, c)) {
        g.mark(r, c, "bad");
        t.at("try", `Row ${r}, column ${c} is attacked`);
        continue;
      }
      cols.push(c);
      paintBoard(g, n, cols);
      g.mark(r, c, "active");
      t.at("place", `Row ${r}, column ${c} is safe: place a queen`);
      if (go(r + 1)) return true;
      cols.pop();
      paintBoard(g, n, cols);
      g.mark(r, c, "dim");
      t.at("undo", `Nothing works below: take the queen off row ${r}, column ${c}`);
    }
    paintBoard(g, n, cols);
    t.at("dead", `Row ${r} has no safe square left: go back up`);
    return false;
  };
  if (go(0)) {
    paintBoard(g, n, cols);
    for (let r = 0; r < n; r++) g.mark(r, cols[r]!, "found");
    t.at("solved", `All ${n} queens placed: ${cols.join(" ")}`);
    return t.result([...cols]);
  }
  t.at("none", `Every square was tried: ${n} queens can't fit on a ${n} × ${n} board`);
  t.result(null);
}
