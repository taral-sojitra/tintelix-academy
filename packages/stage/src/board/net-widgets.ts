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

/** DHCP: one message every 1.2 s of a 6 s cycle; the settings fill in once the ACK has arrived. */
const DHCP_STEP_SEC = 1.2;
const DHCP_CYCLE_SEC = 6;
const DHCP_IP = "192.168.1.101";
const hours = (h: number) => `${Number.isInteger(h) ? h : h.toFixed(1)} h`;

/** TCP vs UDP: eight packets, number 4 lost; one phase a second (arrive, lost, held, resent), a 6 s cycle. */
const ORD_STEP_SEC = 1;
const ORD_CYCLE_SEC = 6;

/**
 * TCP ladders by `ladderStage`: each message as [when, in one-way trips; direction; label], and the line
 * under them. One more message every 0.9 s, then the whole ladder holds for 2 s.
 */
const LADDERS: [number, "r" | "l", string][][] = [
  [],
  [[0, "r", "SYN seq=1000"], [1, "l", "SYN-ACK seq=5000 ack=1001"], [2, "r", "ACK ack=5001"]],
  [[0, "r", "SYN seq=1000"], [1, "l", "SYN-ACK seq=5000 ack=1001"], [2, "r", "ACK + GET /"], [4, "l", "200 OK, the page"]],
  [[0, "r", "FIN"], [1, "l", "ACK"], [1, "l", "FIN"], [2, "r", "ACK"]],
];
const LAD_STEP_SEC = 0.9;
const LAD_HOLD_SEC = 2;

/** The ports lesson's server and its sockets: [protocol, server end, client end, program]. */
const SOCK_LISTEN: string[][] = [["LISTEN", "*:443", "", "web server"], ["LISTEN", "*:22", "", "SSH"], ["LISTEN", "*:5432", "", "database"]];
const SOCK_CONNS: string[][] = [
  ["TCP", "203.0.113.5:443", "198.51.100.7:51000", "web server"],
  ["TCP", "203.0.113.5:443", "198.51.100.7:51001", "web server"],
  ["TCP", "203.0.113.5:443", "198.51.100.9:60123", "web server"],
  ["TCP", "203.0.113.5:22", "198.51.100.20:50555", "SSH"],
  ["TCP", "203.0.113.5:5432", "198.51.100.30:40000", "database"],
];
/** In the port-exhaustion step the app server opens 5 new connections a second, each from the next port. */
const SOCK_NEW_PER_SEC = 5;

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
  /**
   * DHCP from the newcomer's side: the four messages (`dhcpStage` 1 plays them), the settings the phone
   * ends up with, and (stage 2) when it will renew, at half of `leaseHours`.
   */
  dhcp: {
    html: (key) =>
      `<div class="tx-dhcp" data-w="${key}"><div class="tx-dhcp-msgs">${'<p class="tx-dhcp-msg"></p>'.repeat(5)}</div><dl class="tx-dhcp-set">${["IP", "mask", "gateway", "DNS", "lease"].map((k) => `<div><dt>${k}</dt><b></b></div>`).join("")}</dl></div>`,
    paint(root, d, clock) {
      const stage = Math.round(num(d, "dhcpStage", 0));
      const lease = Math.max(0, num(d, "leaseHours", 4));
      const t = Math.max(0, clock) % DHCP_CYCLE_SEC;
      const seen = stage === 1 ? Math.min(4, Math.floor(t / DHCP_STEP_SEC) + 1) : 0;
      const lines = [
        "DISCOVER → everyone: is there a DHCP server?",
        `OFFER → phone: you can have ${DHCP_IP}`,
        `REQUEST → everyone: I'll take ${DHCP_IP}`,
        `ACK → phone: it's yours for ${hours(lease)}`,
        `at ${hours(lease / 2)}: REQUEST → server: may I keep ${DHCP_IP}?`,
      ];
      root.querySelectorAll<HTMLElement>(".tx-dhcp-msg").forEach((p, n) => {
        p.hidden = n < 4 ? n >= seen : stage !== 2;
        p.className = `tx-dhcp-msg ${n === 1 || n === 3 ? "down" : "up"}`;
        setText(p, lines[n]!);
      });
      const known = stage === 2 || (stage === 1 && t >= 4 * DHCP_STEP_SEC);
      const values = [DHCP_IP, "255.255.255.0", "192.168.1.1", "192.168.1.1", hours(lease)];
      root.querySelectorAll(".tx-dhcp-set b").forEach((b, n) => setText(b, known ? values[n]! : "—"));
      root.querySelector(".tx-dhcp-set")!.classList.toggle("known", known);
    },
  },
  /**
   * TCP vs UDP at the receiver: packets 1–8 with number 4 lost. TCP holds 5–8 until 4 is resent, then
   * hands all over in order; UDP hands each over as it arrives and never gets 4. `stallMs` is the wait.
   */
  order: {
    html: (key) =>
      `<div class="tx-ord" data-w="${key}">${["TCP", "UDP"].map((n) => `<div class="tx-ord-row"><em>${n}</em>${[1, 2, 3, 4, 5, 6, 7, 8].map((k) => `<i>${k}</i>`).join("")}</div>`).join("")}<p class="tx-calc-s tx-ord-cap"></p></div>`,
    paint(root, d, clock) {
      const phase = Math.min(3, Math.floor((Math.max(0, clock) % ORD_CYCLE_SEC) / ORD_STEP_SEC));
      const tcp = (k: number) => (k < 3 ? "ok" : k === 3 ? (phase === 0 ? "" : phase === 3 ? "resent" : "lost") : phase < 2 ? "" : phase === 2 ? "wait" : "ok");
      const udp = (k: number) => (k < 3 ? "ok" : k === 3 ? (phase === 0 ? "" : "lost") : phase < 2 ? "" : "ok");
      const [t, u] = [...root.querySelectorAll<HTMLElement>(".tx-ord-row")];
      t!.querySelectorAll("i").forEach((c, k) => (c.className = tcp(k)));
      u!.querySelectorAll("i").forEach((c, k) => (c.className = udp(k)));
      const stall = Math.round(num(d, "stallMs", 120));
      const text = [
        "1–3 arrive in both",
        "4 is lost on the way",
        "TCP holds 5–8 until 4 comes; UDP hands them over now",
        `4 resent ${stall} ms later: TCP delivers 4–8 in order`,
      ][phase]!;
      setText(root.querySelector(".tx-ord-cap")!, text);
    },
  },
  /**
   * A TCP ladder: the messages between client (left) and server (right) with their times, from `rttMs`.
   * `ladderStage` 1 is the handshake, 2 the handshake with a request, 3 the close; 0 draws nothing.
   */
  ladder: {
    html: (key) =>
      `<div class="tx-lad" data-w="${key}"><div class="tx-lad-head"><em></em><span>client</span><span>server</span></div>${'<div class="tx-lad-row"><em></em><span></span></div>'.repeat(4)}<p class="tx-calc-s tx-lad-cap"></p></div>`,
    paint(root, d, clock) {
      const stage = Math.min(LADDERS.length - 1, Math.max(0, Math.round(num(d, "ladderStage", 0))));
      const rtt = Math.max(0, num(d, "rttMs", 80));
      const msgs = LADDERS[stage]!;
      const cycle = msgs.length * LAD_STEP_SEC + LAD_HOLD_SEC;
      const seen = msgs.length ? Math.min(msgs.length, Math.floor((Math.max(0, clock) % cycle) / LAD_STEP_SEC) + 1) : 0;
      root.querySelectorAll<HTMLElement>(".tx-lad-row").forEach((row, n) => {
        const m = msgs[n];
        if (!m) {
          row.hidden = true;
          return;
        }
        row.className = `tx-lad-row ${m[1]}`;
        row.hidden = n >= seen;
        setText(row.querySelector("em")!, `${Math.round((m[0] * rtt) / 2)} ms`);
        setText(row.querySelector("span")!, m[2]);
      });
      const r = Math.round(rtt);
      const text = [
        "no connection yet",
        `connected after ${r} ms: one round trip`,
        `first byte of the page at ${2 * r} ms: two round trips`,
        "closed: each side sent a FIN and got an ACK",
      ][stage]!;
      setText(root.querySelector(".tx-lad-cap")!, text);
    },
  },
  /**
   * The server's socket table. `sockStage` 0: the three listening programs. 1: five connections, the two
   * from one laptop picked out. 2: the same, with the app server's source port moving on as it opens
   * connection after connection.
   */
  sockets: {
    html: (key) =>
      `<div class="tx-sock" data-w="${key}"><div class="tx-sock-head"><span>proto</span><span>server end</span><span>client end</span><span>program</span></div>${'<div class="tx-sock-row"><span></span><span></span><span></span><span></span></div>'.repeat(5)}<p class="tx-calc-s tx-sock-cap"></p></div>`,
    paint(root, d, clock) {
      const stage = Math.min(2, Math.max(0, Math.round(num(d, "sockStage", 0))));
      const rows = stage === 0 ? SOCK_LISTEN : SOCK_CONNS;
      const appPort = 40000 + Math.floor(Math.max(0, clock) * SOCK_NEW_PER_SEC);
      root.querySelectorAll<HTMLElement>(".tx-sock-row").forEach((row, n) => {
        const r = rows[n];
        row.hidden = !r;
        if (!r) return;
        const pick = (stage === 1 && n < 2) || (stage === 2 && n === 4);
        row.classList.toggle("pick", pick);
        row.querySelectorAll("span").forEach((cell, c) => setText(cell, stage === 2 && n === 4 && c === 2 ? `198.51.100.30:${appPort}` : r[c]!));
      });
      const text = [
        "3 programs listening, one port each",
        "5 connections, 1 address: told apart by protocol and both ends' IP and port",
        "each new connection from the app server takes a fresh source port",
      ][stage]!;
      setText(root.querySelector(".tx-sock-cap")!, text);
    },
  },
};
