import type { BoardFlow, SceneSpec } from "@tintelix/schema";

const TO_ISP: BoardFlow["path"] = [{ wire: "l_w", dir: 1, at: "wifi" }, { wire: "w_i", dir: 1, at: "isp" }];
const hop = (wire: string, at: string) => ({ wire, dir: 1 as const, at });

/**
 * Proxies and VPNs: a laptop at a café, the café's Wi-Fi, the internet, and three ways on: the office's
 * VPN server (with a private app behind it), a proxy, or straight to example.com. Below, the packet as
 * the café sees it, and who sees your address.
 */
export const vpnScene: SceneSpec = {
  kind: "board",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 26, w: 984, h: 426 },
  regions: [{ id: "office", label: "Office network · private", x: 552, y: 28, w: 440, h: 112 }],
  nodes: {
    laptop: { x: 20, y: 150, w: 130, h: 64, kind: "users", label: "Laptop", sub: "at a café" },
    wifi: { x: 186, y: 150, w: 160, h: 64, kind: "edge", label: "Café Wi-Fi", sub: "watching" },
    isp: { x: 382, y: 150, w: 130, h: 64, kind: "services", label: "Internet", sub: "routers" },
    vpn: { x: 566, y: 64, w: 180, h: 62, kind: "lb", label: "VPN server", sub: "198.51.100.20" },
    app: { x: 800, y: 64, w: 180, h: 62, kind: "app", label: "Office app", sub: "10.0.0.5" },
    site: { x: 800, y: 156, w: 180, h: 62, kind: "origin", label: "example.com", sub: "203.0.113.80" },
    proxy: { x: 566, y: 222, w: 180, h: 62, kind: "lb", label: "Proxy", sub: "198.51.100.30" },
    sees: { x: 20, y: 300, w: 960, h: 150, kind: "curve", label: "What crosses the café Wi-Fi", sub: "and who sees your address" },
  },
  wires: {
    l_w: { from: [150, 182], to: [186, 182] },
    w_i: { from: [346, 182], to: [382, 182] },
    i_v: { from: [512, 168], to: [566, 95] },
    v_a: { from: [746, 95], to: [800, 95] },
    v_s: { from: [746, 110], to: [800, 178] },
    i_s: { from: [512, 182], to: [800, 188] },
    i_p: { from: [512, 196], to: [566, 253] },
    p_s: { from: [746, 253], to: [800, 204] },
  },
  board: {
    legend: [["cyan", "plain HTTPS"], ["violet", "inside the tunnel"], ["amber", "through the proxy"], ["red", "can't get there"]],
    flows: {
      direct: { from: "laptop", path: [...TO_ISP, hop("i_s", "site")], color: "cyan", back: "green", float: { at: "wifi", text: "to example.com", color: "cyan", chance: 0.3 } },
      noRoute: { from: "laptop", path: [...TO_ISP, hop("i_v", "vpn")], color: "red", fail: { at: "isp", share: "blockedPct" }, float: { at: "isp", text: "10.0.0.5? no route", color: "red", chance: 0.6 } },
      toApp: {
        from: "laptop",
        path: [...TO_ISP, hop("i_v", "vpn"), hop("v_a", "app")],
        color: "violet",
        back: "green",
        floats: [
          { at: "wifi", text: "just a tunnel", color: "violet", chance: 0.4 },
          { at: "vpn", text: "unwrapped", color: "violet", chance: 0.4 },
        ],
      },
      viaVpn: { from: "laptop", path: [...TO_ISP, hop("i_v", "vpn"), hop("v_s", "site")], color: "violet", back: "green" },
      viaProxy: { from: "laptop", path: [...TO_ISP, hop("i_p", "proxy"), hop("p_s", "site")], color: "amber", back: "green", float: { at: "proxy", text: "CONNECT example.com", color: "amber", chance: 0.4 } },
    },
    modes: [
      {
        flows: [{ flow: "direct", weight: 2 }, { flow: "noRoute", weight: 1 }],
        rate: 1.6,
        tiles: [
          { id: "a", label: "Office app", icon: "alert", hue: "amber", value: "Unreachable", note: "10.0.0.5 is private", mood: "bad" },
          { id: "b", label: "Café Wi-Fi sees", icon: "target", hue: "violet", value: "Every site", note: "even with HTTPS" },
          { id: "c", label: "Round trip", icon: "timer", hue: "cyan", value: "{directMs}", note: "café to example.com" },
        ],
      },
      {
        flows: [{ flow: "toApp", weight: 1 }],
        rate: 1.4,
        tiles: [
          { id: "a", label: "Office app", icon: "check", hue: "green", value: "Reachable", note: "{officeMs} round trip", mood: "good" },
          { id: "b", label: "Wrapped", icon: "blocks", hue: "violet", value: "Every packet", note: "all apps, not just one" },
          { id: "c", label: "Extra per packet", icon: "spark", hue: "amber", value: "{overheadBytes} bytes", note: "outer IP, UDP, tunnel header" },
        ],
      },
      {
        flows: [{ flow: "toApp", weight: 1 }, { flow: "viaVpn", weight: 2 }],
        rate: 2,
        tiles: [
          { id: "a", label: "Web round trip", icon: "timer", hue: "amber", value: "{vpnMs}", note: "vs {directMs} direct", mood: "bad" },
          { id: "b", label: "Sites see", icon: "target", hue: "violet", value: "The VPN server", note: "198.51.100.20" },
          { id: "c", label: "Overhead", icon: "gauge", hue: "cyan", value: "{overheadPct}", note: "of a full frame" },
        ],
      },
      {
        flows: [{ flow: "toApp", weight: 1 }, { flow: "direct", weight: 2 }],
        rate: 2,
        tiles: [
          { id: "a", label: "Office traffic", icon: "shuffle", hue: "violet", value: "Tunnel", note: "{officeMs} round trip" },
          { id: "b", label: "Web traffic", icon: "timer", hue: "cyan", value: "Direct", note: "{directMs} round trip", mood: "good" },
          { id: "c", label: "Café Wi-Fi sees", icon: "target", hue: "amber", value: "Your sites again", note: "the trade-off" },
        ],
      },
      {
        flows: [{ flow: "viaProxy", weight: 2 }, { flow: "direct", weight: 1 }],
        rate: 2,
        tiles: [
          { id: "a", label: "Proxy carries", icon: "spark", hue: "amber", value: "One app", note: "the browser, set up to use it" },
          { id: "b", label: "Proxy sees", icon: "target", hue: "violet", value: "The site's name", note: "not the HTTPS inside" },
          { id: "c", label: "Other apps", icon: "shuffle", hue: "cyan", value: "Go direct", note: "unless set up too" },
        ],
      },
    ],
    widgets: { sees: [{ kind: "custom", name: "tunnel" }] },
  },
};
