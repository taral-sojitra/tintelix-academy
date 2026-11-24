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

/** The sample IPv6 address, in full: the first four groups are the network (/64), the last four the device. */
const V6_GROUPS = ["2001", "0db8", "0000", "0042", "0000", "8a2e", "0370", "7334"];

/** The ARP lesson's addresses: made-up, locally administered MACs (they start 02:), as phones use today. */
const ARP_LAPTOP = "02:1a:2b:3c:4d:5e";
const ARP_ROUTER = "02:aa:bb:cc:dd:01";
/** The exchange: the request shows at once, the reply after 1.2 s, the cache entry after 2.4 s; a 4 s cycle. */
const ARP_REPLY_SEC = 1.2;
const ARP_CACHE_SEC = 2.4;
const ARP_CYCLE_SEC = 4;

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
  /**
   * An IPv4 address (`ipA`–`ipD`) in dotted decimal and as 32 bits, split at `prefixLen` into the network
   * part and the host part, with its mask and network address; `v6` 1 shows an IPv6 address instead.
   */
  ipbits: {
    html: (key) =>
      `<div class="tx-ip" data-w="${key}"><p class="tx-ip-dec"></p><div class="tx-ip-bits">${[0, 1, 2, 3].map(() => `<span>${"<i></i>".repeat(8)}</span>`).join("")}</div><p class="tx-calc-s tx-ip-cap"></p></div>`,
    paint(root, d) {
      const dec = root.querySelector<HTMLElement>(".tx-ip-dec")!;
      const bits = root.querySelector<HTMLElement>(".tx-ip-bits")!;
      const cap = root.querySelector(".tx-ip-cap")!;
      if (Math.round(num(d, "v6", 0)) === 1) {
        bits.hidden = true;
        const html = V6_GROUPS.map((g, n) => `<span class="${n < 4 ? "net" : "host"}">${g}</span>`).join(":");
        if (dec.innerHTML !== html) dec.innerHTML = html;
        setText(cap, "128 bits · network /64 · device 64 bits");
        return;
      }
      bits.hidden = false;
      const octets = ["ipA", "ipB", "ipC", "ipD"].map((k) => Math.min(255, Math.max(0, Math.round(num(d, k, 0)))));
      const prefix = Math.min(32, Math.max(0, Math.round(num(d, "prefixLen", 24))));
      const html = octets
        .map((o, n) => {
          const cls = (n + 1) * 8 <= prefix ? "net" : n * 8 >= prefix ? "host" : "mix";
          return `<span class="${cls}">${o}</span>`;
        })
        .join(".");
      if (dec.innerHTML !== html) dec.innerHTML = html;
      root.querySelectorAll<HTMLElement>(".tx-ip-bits i").forEach((cell, b) => {
        const bit = String((octets[Math.floor(b / 8)]! >> (7 - (b % 8))) & 1);
        setText(cell, bit);
        cell.className = b < prefix ? "net" : "host";
      });
      const mask = [0, 1, 2, 3].map((n) => {
        const on = Math.min(8, Math.max(0, prefix - n * 8));
        return (0xff << (8 - on)) & 0xff;
      });
      const network = octets.map((o, n) => o & mask[n]!);
      setText(cap, `mask ${mask.join(".")} · network ${network.join(".")}/${prefix}`);
    },
  },
  /**
   * Subnetting 192.168.1.0/24: the block cut into subnets of `subPrefix`, hosts A (`hostA`) and B
   * (`hostB`) marked on it, each address ANDed with the mask, and whether A can send to B directly.
   */
  subnets: {
    html: (key) =>
      `<div class="tx-sn" data-w="${key}"><div class="tx-sn-bar"><div class="tx-sn-segs"></div><i class="tx-sn-mark a">A</i><i class="tx-sn-mark b">B</i></div><p class="tx-sn-and"></p><p class="tx-sn-and"></p><p class="tx-calc-s tx-sn-cap"></p></div>`,
    paint(root, d) {
      const prefix = Math.min(30, Math.max(24, Math.round(num(d, "subPrefix", 24))));
      const a = Math.min(255, Math.max(0, Math.round(num(d, "hostA", 42))));
      const b = Math.min(255, Math.max(0, Math.round(num(d, "hostB", 100))));
      const size = 2 ** (32 - prefix);
      const count = 256 / size;
      const segs = root.querySelector<HTMLElement>(".tx-sn-segs")!;
      if (segs.childElementCount !== count) segs.innerHTML = '<span class="tx-sn-seg"></span>'.repeat(count);
      segs.querySelectorAll<HTMLElement>(".tx-sn-seg").forEach((seg, n) => {
        setText(seg, count <= 8 ? `.${n * size}` : "");
        seg.classList.toggle("a", Math.floor(a / size) === n);
        seg.classList.toggle("b", Math.floor(b / size) === n);
      });
      root.querySelector<HTMLElement>(".tx-sn-mark.a")!.style.left = `${((a + 0.5) / 256) * 100}%`;
      root.querySelector<HTMLElement>(".tx-sn-mark.b")!.style.left = `${((b + 0.5) / 256) * 100}%`;
      const last = (256 - size) & 0xff;
      const lines = root.querySelectorAll(".tx-sn-and");
      setText(lines[0]!, `A 192.168.1.${a} AND 255.255.255.${last} = 192.168.1.${a & last}`);
      setText(lines[1]!, `B 192.168.1.${b} AND 255.255.255.${last} = 192.168.1.${b & last}`);
      const same = (a & last) === (b & last);
      setText(root.querySelector(".tx-sn-cap")!, same ? "same subnet: A sends straight to B" : "different subnets: A sends it to the router");
    },
  },
  /**
   * ARP from the laptop's side: the broadcast question, the router's answer and the laptop's cache.
   * `arpStage` 0 knows nothing, 1 plays the exchange, 2 sends from the cache for `cacheSec` seconds.
   */
  arp: {
    html: (key) =>
      `<div class="tx-arp" data-w="${key}"><p class="tx-arp-line ask"></p><p class="tx-arp-line ans"></p><p class="tx-arp-line use"></p><p class="tx-arp-cache"><em>ARP cache</em><span class="tx-arp-row"></span></p></div>`,
    paint(root, d, clock) {
      const stage = Math.round(num(d, "arpStage", 0));
      const t = Math.max(0, clock) % ARP_CYCLE_SEC;
      const [ask, ans, use] = [...root.querySelectorAll<HTMLElement>(".tx-arp-line")];
      ask!.hidden = stage !== 1;
      ans!.hidden = stage !== 1 || t < ARP_REPLY_SEC;
      use!.hidden = stage !== 2;
      setText(ask!, "to ff:ff:ff:ff:ff:ff (everyone): who has 192.168.1.1? tell 192.168.1.42");
      setText(ans!, `to ${ARP_LAPTOP}: 192.168.1.1 is at ${ARP_ROUTER}`);
      setText(use!, `to ${ARP_ROUTER} directly: no broadcast`);
      const known = stage === 2 || (stage === 1 && t >= ARP_CACHE_SEC);
      const left = Math.max(0, Math.round(num(d, "cacheSec", 60)) - Math.floor(Math.max(0, clock)));
      const row = !known ? "192.168.1.1 → ?" : stage === 2 ? `192.168.1.1 → ${ARP_ROUTER} · ${left} s left` : `192.168.1.1 → ${ARP_ROUTER}`;
      const el = root.querySelector(".tx-arp-row")!;
      setText(el, row);
      el.classList.toggle("known", known);
    },
  },
};
