import type { Outputs } from "@tintelix/schema";
import type { Custom } from "./widgets";

const group = (n: number) => Math.round(n).toLocaleString("en-US");
const num = (d: Outputs, name: string, fallback: number) => (Number.isFinite(d[name]) ? d[name]! : fallback);
const setText = (el: Element, text: string) => {
  if (el.textContent !== text) el.textContent = text;
};

/**
 * Each layer's view of one segment, top to bottom: its name and which of the frame's parts it holds
 * (Ethernet header, IP, TCP, data, Ethernet's 4-byte check at the end).
 */
const ENV_ROWS: [string, boolean[]][] = [
  ["message", [false, false, false, true, false]],
  ["segment", [false, false, true, true, false]],
  ["packet", [false, true, true, true, false]],
  ["frame", [true, true, true, true, true]],
];
/** One more layer every 1.2 s, then the whole picture holds; a 6 s cycle. */
const ENV_STEP_SEC = 1.2;
const ENV_CYCLE_SEC = 6;

/** Custom widgets for the Networks lessons, merged into the board's CUSTOM registry. */
export const NET_CUSTOM: Record<string, Custom> = {
  /**
   * Encapsulation: the app's message gets a header from each layer on the way down (`wrap` 1), crosses
   * as one frame (2) and loses them again on the way up (3); 0 shows the message alone.
   */
  headers: {
    html: (key) =>
      `<div class="tx-env" data-w="${key}">${ENV_ROWS.map(() => `<div class="tx-env-row"><em></em>${"<span></span>".repeat(5)}</div>`).join("")}<p class="tx-calc-s tx-env-cap"></p></div>`,
    paint(root, d, clock) {
      const wrap = Math.round(num(d, "wrap", 0));
      const payload = group(num(d, "payloadBytes", 0));
      const data = group(num(d, "firstSegBytes", 0));
      const phase = Math.min(3, Math.floor((Math.max(0, clock) % ENV_CYCLE_SEC) / ENV_STEP_SEC));
      const shown = (row: number) => (wrap === 0 ? row === 0 : wrap === 1 ? row <= phase : wrap === 3 ? row >= 3 - phase : true);
      const newest = wrap === 1 ? phase : wrap === 3 ? 3 - phase : -1;
      const cells = ["Eth 14", "IP 20", "TCP 20", `data ${data}`, "FCS 4"];
      root.querySelectorAll<HTMLElement>(".tx-env-row").forEach((row, n) => {
        const [name, has] = ENV_ROWS[n]!;
        row.hidden = !shown(n);
        row.classList.toggle("new", n === newest);
        setText(row.querySelector("em")!, name);
        row.querySelectorAll("span").forEach((span, c) => {
          span.className = has[c] ? `p-${c}` : "gap";
          setText(span, has[c] ? cells[c]! : "");
        });
      });
      const down = [
        `the app hands down ${payload} bytes`,
        `transport cuts ${data} bytes and adds TCP: 20 bytes`,
        "network adds an IP header: 20 bytes",
        "data link adds Ethernet: 14 bytes in front, 4 at the end",
      ];
      const up = [
        `a frame arrives: ${group(num(d, "frameBytes", 0))} bytes`,
        "data link checks it and strips Ethernet: 18 bytes",
        "network strips IP: 20 bytes",
        `transport strips TCP: the app gets ${payload} bytes`,
      ];
      const text =
        wrap === 0
          ? `the app's message: ${payload} bytes`
          : wrap === 1
            ? down[phase]!
            : wrap === 3
              ? up[phase]!
              : `one frame: ${group(num(d, "frameBytes", 0))} bytes, ${group(num(d, "headerPerSeg", 58))} of them headers`;
      setText(root.querySelector(".tx-env-cap")!, text);
    },
  },
};
