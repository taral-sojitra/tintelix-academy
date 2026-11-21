// Stage layout audit, run by stage_audit.py on every lesson step. Installs canvas hooks, then
// window.__txAudit() returns what overlaps right now: dots or labels over boxes, text outside its box, and so on.
(() => {
  if (window.__txAuditInstalled) return;
  window.__txAuditInstalled = true;
  const P = CanvasRenderingContext2D.prototype;
  const isFront = (ctx) => ctx.canvas && ctx.canvas.classList && ctx.canvas.classList.contains("tx-front");
  const frames = new WeakMap(); // canvas -> { cur, last }
  const st = (ctx) => {
    let f = frames.get(ctx.canvas);
    if (!f) frames.set(ctx.canvas, (f = { cur: [], last: [] }));
    return f;
  };
  const tp = (ctx, x, y) => {
    const m = ctx.getTransform();
    return [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f, Math.hypot(m.a, m.b)];
  };
  const origClear = P.clearRect;
  P.clearRect = function (...a) {
    if (isFront(this)) {
      const f = st(this);
      f.last = f.cur;
      f.cur = [];
    }
    return origClear.apply(this, a);
  };
  const origArc = P.arc;
  P.arc = function (x, y, r, ...rest) {
    // Packet cores are drawn with r = 4.3 (2.7 for small ones); the glow and the white centre are ignored.
    if (isFront(this) && (Math.abs(r - 4.3) < 0.01 || Math.abs(r - 2.7) < 0.01)) {
      const [px, py, s] = tp(this, x, y);
      st(this).cur.push({ t: "dot", x: px, y: py, r: r * s });
    }
    return origArc.call(this, x, y, r, ...rest);
  };
  const origRR = P.roundRect;
  P.roundRect = function (x, y, w, h, ...rest) {
    if (isFront(this)) {
      const [px, py, s] = tp(this, x, y);
      st(this).cur.push({ t: "pill", x: px, y: py, w: w * s, h: h * s, text: "" });
    }
    return origRR.call(this, x, y, w, h, ...rest);
  };
  const origFT = P.fillText;
  P.fillText = function (text, ...rest) {
    if (isFront(this)) {
      const cur = st(this).cur;
      const last = cur[cur.length - 1];
      if (last && last.t === "pill" && !last.text) last.text = String(text);
    }
    return origFT.call(this, text, ...rest);
  };

  const R = (el) => el.getBoundingClientRect();
  const shown = (el) => {
    if (!el.isConnected) return false;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || parseFloat(cs.opacity) < 0.2) return false;
    const r = R(el);
    return r.width > 0 && r.height > 0;
  };
  const inter = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  const textRects = (el) => {
    const out = [];
    for (const n of el.childNodes) {
      if (n.nodeType !== 3 || !n.textContent.trim()) continue;
      const rg = document.createRange();
      rg.selectNodeContents(n);
      for (const r of rg.getClientRects()) if (r.width > 0) out.push(r);
    }
    return out;
  };
  const label = (el) => (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 60);

  window.__txAudit = () => {
    const stage = document.querySelector(".tx-stage");
    if (!stage) return { error: "no stage" };
    const sr = R(stage);
    const front = stage.querySelector("canvas.tx-front");
    const fr = R(front);
    const k = fr.width / front.width; // canvas pixels -> CSS px
    const map = (o) => ({ ...o, x: fr.left + o.x * k, y: fr.top + o.y * k, r: o.r !== undefined ? o.r * k : undefined, w: o.w !== undefined ? o.w * k : undefined, h: o.h !== undefined ? o.h * k : undefined });
    const draws = (frames.get(front)?.last || []).map(map);
    const nodes = [...stage.querySelectorAll(".tx-node")].filter((n) => shown(n) && !n.classList.contains("hidden"));
    const nr = nodes.map((n) => ({ id: n.dataset.node, el: n, r: R(n) }));
    const issues = [];
    const add = (kind, where, detail, extra = {}) => issues.push({ kind, where, detail, ...extra });

    // 1. Dots drawn on top of boxes.
    for (const d of draws.filter((d) => d.t === "dot")) {
      for (const n of nr) {
        const r = n.r;
        const inside = d.x > r.left && d.x < r.right && d.y > r.top && d.y < r.bottom;
        const dx = Math.max(r.left - d.x, 0, d.x - r.right);
        const dy = Math.max(r.top - d.y, 0, d.y - r.bottom);
        const dist = Math.hypot(dx, dy);
        if (inside) {
          const depth = Math.min(d.x - r.left, r.right - d.x, d.y - r.top, r.bottom - d.y);
          add(depth > 6 ? "dot-inside-box" : "dot-on-box-edge", n.id, `depth ${depth.toFixed(1)}px`, { depth });
        } else if (dist < d.r - 0.5) add("dot-on-box-edge", n.id, `overlaps ${(d.r - dist).toFixed(1)}px`, { depth: 0 });
      }
    }
    // 2. Floating labels over boxes, over each other, over the stage overlays.
    const pills = draws.filter((d) => d.t === "pill").map((p) => ({ ...p, rect: { left: p.x, top: p.y, right: p.x + p.w, bottom: p.y + p.h } }));
    for (const p of pills) {
      for (const n of nr) {
        const a = inter(p.rect, n.r);
        if (a > 40) add("label-over-box", n.id, `"${p.text}" covers ${Math.round((100 * a) / (p.w * p.h))}% of the label`, { text: p.text });
      }
      if (p.rect.left < sr.left - 1 || p.rect.right > sr.right + 1 || p.rect.top < sr.top - 1 || p.rect.bottom > sr.bottom + 1) add("label-off-stage", "stage", `"${p.text}"`);
    }
    for (let i = 0; i < pills.length; i++) for (let j = i + 1; j < pills.length; j++) if (inter(pills[i].rect, pills[j].rect) > 40) add("label-over-label", "stage", `"${pills[i].text}" / "${pills[j].text}"`);

    // 3. Text spilling out of its box, or cut off inside it.
    for (const n of nr) {
      const box = n.r;
      for (const el of n.el.querySelectorAll("*")) {
        if (!shown(el)) continue;
        for (const t of textRects(el)) {
          const out = Math.max(box.left - t.left, t.right - box.right, box.top - t.top, t.bottom - box.bottom);
          if (out > 1.5) add("text-outside-box", n.id, `"${label(el)}" sticks out ${out.toFixed(0)}px`, { text: label(el), px: out });
        }
        const cs = getComputedStyle(el);
        if ((cs.overflow === "hidden" || cs.textOverflow === "ellipsis") && el.scrollWidth > el.clientWidth + 2 && label(el)) add("text-cut-off", n.id, `"${label(el)}" ${el.scrollWidth - el.clientWidth}px hidden`, { text: label(el) });
      }
    }
    // 4. Boxes overlapping each other or leaving the stage.
    for (let i = 0; i < nr.length; i++) {
      const a = nr[i];
      // A zoomed phone stage pans, so boxes beyond its edges are expected there.
      const pans = stage.classList.contains("tx-zoomed");
      if (!pans && (a.r.left < sr.left - 1 || a.r.right > sr.right + 1 || a.r.top < sr.top - 1 || a.r.bottom > sr.bottom + 1)) add("box-off-stage", a.id, "partly outside the stage");
      for (let j = i + 1; j < nr.length; j++) if (inter(a.r, nr[j].r) > 4) add("box-over-box", `${a.id} / ${nr[j].id}`, "boxes overlap");
    }
    // 5. Wire labels and region labels over boxes.
    for (const wl of stage.querySelectorAll(".tx-wlabel, .tx-region span")) {
      if (!shown(wl)) continue;
      for (const n of nr) if (inter(R(wl), n.r) > 4) add("wire-or-region-label-over-box", n.id, `"${label(wl)}"`);
    }
    // 6. Overlays (live tag, legend, chart, play controls) over boxes and over each other.
    const ovs = [...stage.querySelectorAll(".tx-ov")].filter(shown).map((el) => ({ name: el.classList.contains("tx-legend") ? "legend" : el.classList.contains("tx-chartbox") ? "chart" : el.classList.contains("tx-zoom") ? "zoom button" : el.classList.contains("tx-panhint") ? "drag hint" : "live tag", r: R(el) }));
    const ctrls = document.querySelector(".stage-ctrls");
    if (ctrls && shown(ctrls)) ovs.push({ name: "play controls", r: R(ctrls) });
    for (const o of ovs) for (const n of nr) if (inter(o.r, n.r) > 30) add("overlay-over-box", n.id, `${o.name} covers part of the box`);
    for (let i = 0; i < ovs.length; i++) for (let j = i + 1; j < ovs.length; j++) if (inter(ovs[i].r, ovs[j].r) > 30) add("overlay-over-overlay", "stage", `${ovs[i].name} / ${ovs[j].name}`);
    for (const o of ovs) for (const p of pills) if (inter(o.r, p.rect) > 40) add("label-under-overlay", o.name, `"${p.text}"`);

    // 7. Number tiles above the stage.
    for (const m of document.querySelectorAll(".tx-met")) {
      if (!shown(m)) continue;
      const box = R(m);
      for (const el of m.querySelectorAll("*")) {
        if (!shown(el)) continue;
        for (const t of textRects(el)) {
          const out = Math.max(box.left - t.left, t.right - box.right, box.top - t.top, t.bottom - box.bottom);
          if (out > 1.5) add("tile-text-outside", `tile ${m.dataset.tile}`, `"${label(el)}" sticks out ${out.toFixed(0)}px`);
        }
      }
    }
    // 8. Page-wide sideways scroll.
    if (document.documentElement.scrollWidth > innerWidth + 1) add("page-scrolls-sideways", "page", `${document.documentElement.scrollWidth - innerWidth}px wider than the screen`);
    const h2 = document.querySelector(".narr h2");
    return { step: h2 ? h2.textContent.trim() : "", dots: draws.filter((d) => d.t === "dot").length, issues };
  };
})();
