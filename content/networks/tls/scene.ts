import type { BoardFlow, SceneSpec } from "@tintelix/schema";

const OUT: BoardFlow["path"] = [{ wire: "b_w", dir: 1, at: "wifi" }, { wire: "w_s", dir: 1, at: "server" }];
const BACK: BoardFlow["path"] = [{ wire: "w_s", dir: -1, at: "wifi" }, { wire: "b_w", dir: -1, at: "browser" }];
const at = (stage: number) => ({ output: "tlsStage", above: stage - 0.5, below: stage + 0.5 });
const seq = (...names: string[]) => names.map((flow) => ({ flow, weight: 1 }));

/**
 * TLS: a browser, the café Wi-Fi it talks through (anyone there could be listening), and example.com,
 * whose certificate a certificate authority signed. The handshake plays in order; once it's done the
 * Wi-Fi only sees sealed data. Below, what's happening at each stage.
 */
export const tlsScene: SceneSpec = {
  kind: "board",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 30, w: 984, h: 420 },
  nodes: {
    browser: { x: 30, y: 60, w: 210, h: 80, kind: "users", label: "Your browser", sub: "at a café" },
    wifi: { x: 395, y: 60, w: 210, h: 80, kind: "edge", label: "Café Wi-Fi", sub: "anyone could listen" },
    server: { x: 760, y: 60, w: 210, h: 80, kind: "origin", label: "example.com", sub: "has a certificate" },
    ca: { x: 760, y: 176, w: 210, h: 66, kind: "services", label: "Cert. authority", sub: "signed the cert" },
    story: { x: 30, y: 262, w: 940, h: 186, kind: "curve", label: "What's happening", sub: "and what the Wi-Fi can see" },
  },
  wires: {
    b_w: { from: [240, 100], to: [395, 100] },
    w_s: { from: [605, 100], to: [760, 100] },
    ca_s: { from: [865, 176], to: [865, 140], straight: true },
  },
  board: {
    legend: [["amber", "readable by anyone"], ["cyan", "handshake"], ["green", "sealed"]],
    flows: {
      plain: { from: "browser", path: OUT, color: "amber", back: "amber", float: { at: "wifi", text: "can read it all", color: "amber", chance: 0.5 } },
      hello: { from: "browser", path: OUT, color: "cyan", float: { at: "server", text: "hello + key share", color: "cyan", chance: 1 } },
      reply: { from: "server", path: BACK, color: "cyan", float: { at: "browser", text: "key share + certificate", color: "cyan", chance: 1 } },
      finished: { from: "browser", path: OUT, color: "green", float: { at: "wifi", text: "can't read it", color: "green", chance: 1 } },
      page: { from: "server", path: BACK, color: "green", float: { at: "browser", text: "the page, sealed", color: "green", chance: 1 } },
    },
    modes: [
      {
        flows: seq("plain"),
        rate: 1.5,
        tiles: [
          { id: "a", label: "Wi-Fi can read", icon: "alert", hue: "amber", value: "Everything", note: "pages, cookies, passwords", mood: "bad" },
          { id: "b", label: "Protocol", icon: "blocks", hue: "violet", value: "HTTP", note: "port 80, plain text" },
          { id: "c", label: "The fix", icon: "check", hue: "green", value: "TLS", note: "HTTPS, port 443" },
        ],
      },
      {
        flows: seq("hello", "reply"),
        sequence: true,
        rate: 1.2,
        tiles: [
          { id: "a", label: "Secrets sent", icon: "target", hue: "green", value: "0", note: "only public halves" },
          { id: "b", label: "Shared key", icon: "check", hue: "cyan", value: "The same", note: "worked out on each side" },
          { id: "c", label: "Wi-Fi can work it out", icon: "alert", hue: "amber", value: "No", note: "it saw both halves" },
        ],
      },
      {
        flows: seq("hello", "reply"),
        sequence: true,
        rate: 1.2,
        tiles: [
          { id: "a", label: "Certificate lasts", icon: "timer", hue: "violet", value: "≤ {certDays} days", note: "{certDays2029} from 2029" },
          { id: "b", label: "Chain", icon: "list", hue: "cyan", value: "3 links", note: "site, intermediate, root" },
          { id: "c", label: "Proof", icon: "check", hue: "green", value: "A signature", note: "with the site's private key" },
        ],
      },
      {
        flows: seq("hello", "reply", "finished", "page"),
        sequence: true,
        rate: 1.2,
        tiles: [
          { id: "a", label: "TLS 1.3 adds", icon: "timer", hue: "cyan", value: "1 round trip", note: "after TCP's" },
          { id: "b", label: "First byte", icon: "timer", hue: "violet", value: "{tls13FirstByteMs}", note: "TCP, TLS, then the request" },
          { id: "c", label: "Wi-Fi still sees", icon: "target", hue: "amber", value: "The site's name", note: "not what you do there" },
        ],
      },
      {
        flows: seq("hello", "reply", "finished", "page"),
        sequence: true,
        rate: 1.2,
        tiles: [
          { id: "a", label: "TLS 1.2", icon: "timer", hue: "amber", value: "{tls12FirstByteMs}", note: "2 round trips to set up" },
          { id: "b", label: "TLS 1.3", icon: "timer", hue: "cyan", value: "{tls13FirstByteMs}", note: "1 round trip", mood: "good" },
          { id: "c", label: "QUIC (HTTP/3)", icon: "timer", hue: "green", value: "{quicFirstByteMs}", note: "TCP's and TLS's together", mood: "good" },
        ],
      },
    ],
    widgets: {
      story: [
        {
          kind: "log",
          lines: [
            { text: "Plain HTTP: every byte crosses the Wi-Fi as readable text", when: at(0) },
            { text: "Your password, your cookies, the pages you open", when: at(0) },
            { text: "1. Browser picks a secret and sends only its public half", when: at(1) },
            { text: "2. Server does the same", when: at(1) },
            { text: "3. Each mixes its own secret with the other's half: the same key", when: at(1) },
            { text: "The Wi-Fi saw both halves and still can't make the key", when: at(1) },
            { text: "example.com's certificate: its name, its public key, {certDays} days", when: at(2) },
            { text: "Signed by an intermediate CA, which a root CA signed", when: at(2) },
            { text: "The root ships inside your browser: the chain checks out", when: at(2) },
            { text: "The server signs the handshake with its private key: it's really them", when: at(2) },
            { text: "Hello and reply done: one round trip after TCP's", when: at(3) },
            { text: "Finished, then GET / and the page, sealed with the shared key", when: at(3) },
            { text: "The Wi-Fi sees the site's name, sizes and timing", when: at(3) },
            { text: "It can't see pages, cookies or passwords", when: at(3) },
          ],
        },
      ],
    },
  },
};
