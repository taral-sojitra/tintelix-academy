import type { BoardFlow, SceneSpec } from "@tintelix/schema";

const out = (from: string, wire: string, extra: Partial<BoardFlow> = {}): BoardFlow => ({
  from,
  path: [{ wire, dir: 1, at: "router" }, { wire: "r_s", dir: 1, at: "server" }],
  color: "cyan",
  back: "green",
  ...extra,
});

/**
 * NAT: three devices at home with private addresses, the home router with the one public address, a
 * server on the internet, and someone out there knocking unasked. Below, the router's NAT table.
 */
export const natScene: SceneSpec = {
  kind: "board",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 26, w: 984, h: 426 },
  regions: [
    { id: "home", label: "Home · 192.168.1.0/24", x: 8, y: 28, w: 340, h: 236 },
    { id: "internet", label: "The internet", x: 560, y: 28, w: 432, h: 236 },
  ],
  nodes: {
    laptop: { x: 24, y: 56, w: 200, h: 60, kind: "users", label: "Laptop", sub: "192.168.1.42" },
    phone: { x: 24, y: 126, w: 200, h: 60, kind: "users", label: "Phone", sub: "192.168.1.43" },
    tv: { x: 24, y: 196, w: 200, h: 60, kind: "users", label: "TV", sub: "192.168.1.50" },
    router: { x: 340, y: 114, w: 230, h: 84, kind: "lb", label: "Home router · NAT", sub: "public 203.0.113.10" },
    server: { x: 770, y: 62, w: 210, h: 68, kind: "origin", label: "Server", sub: "198.51.100.7:443" },
    stranger: { x: 770, y: 176, w: 210, h: 68, kind: "users", label: "Stranger", sub: "198.51.100.66" },
    table: { x: 24, y: 274, w: 952, h: 176, kind: "curve", label: "The router's NAT table", sub: "inside ↔ outside" },
  },
  wires: {
    l_r: { from: [224, 86], to: [340, 142] },
    p_r: { from: [224, 156], to: [340, 156] },
    t_r: { from: [224, 226], to: [340, 170] },
    r_s: { from: [570, 146], to: [770, 96] },
    x_r: { from: [770, 210], to: [570, 170] },
  },
  board: {
    legend: [["cyan", "out, rewritten"], ["green", "reply, mapped back"], ["red", "unasked, dropped"]],
    flows: {
      laptop: out("laptop", "l_r", { float: { at: "router", text: ".42:51000 → .10:40001", color: "amber", chance: 0.4 } }),
      phone: out("phone", "p_r"),
      tv: out("tv", "t_r"),
      knock: {
        from: "stranger",
        path: [{ wire: "x_r", dir: 1, at: "router" }],
        color: "red",
        fail: { at: "router", share: "blockedPct" },
        float: { at: "router", text: "no entry", color: "red", chance: 0.6 },
      },
    },
    modes: [
      {
        flows: [{ flow: "laptop", weight: 1 }, { flow: "phone", weight: 1 }, { flow: "tv", weight: 1 }],
        rate: 2,
        tiles: [
          { id: "a", label: "Devices at home", icon: "users", hue: "violet", value: "{devices}", note: "private addresses" },
          { id: "b", label: "Public addresses", icon: "target", hue: "amber", value: "1", note: "203.0.113.10" },
          { id: "c", label: "The question", icon: "alert", hue: "cyan", value: "Whose reply?", note: "they all come back to .10" },
        ],
      },
      {
        flows: [{ flow: "laptop", weight: 1 }],
        rate: 1.2,
        tiles: [
          { id: "a", label: "Source rewritten", icon: "shuffle", hue: "amber", value: ".42:51000", note: "becomes .10:40001" },
          { id: "b", label: "Server sees", icon: "target", hue: "cyan", value: "203.0.113.10", note: "not the laptop" },
          { id: "c", label: "Remembered in", icon: "list", hue: "violet", value: "The NAT table", note: "one entry per connection" },
        ],
      },
      {
        flows: [{ flow: "laptop", weight: 1 }, { flow: "phone", weight: 1 }, { flow: "tv", weight: 1 }],
        rate: 2.5,
        tiles: [
          { id: "a", label: "Table entries", icon: "list", hue: "violet", value: "{natEntries}", note: "{devices} devices × {connsPerDevice}" },
          { id: "b", label: "Ports used", icon: "gauge", hue: "cyan", value: "{portsUsedPct}", note: "of {natPorts}" },
          { id: "c", label: "Most devices", icon: "users", hue: "green", value: "{maxDevices}", note: "at {connsPerDevice} connections each" },
        ],
      },
      {
        flows: [{ flow: "laptop", weight: 2 }, { flow: "phone", weight: 1 }, { flow: "knock", weight: 2 }],
        rate: 2.5,
        tiles: [
          { id: "a", label: "Unasked packets", icon: "alert", hue: "amber", value: "{blockedPct} dropped", note: "no entry to follow", mood: "good" },
          { id: "b", label: "To host a server", icon: "shuffle", hue: "violet", value: "Port forwarding", note: "a fixed entry you add" },
          { id: "c", label: "Replies", icon: "check", hue: "green", value: "Still arrive", note: "they match an entry" },
        ],
      },
      {
        flows: [{ flow: "laptop", weight: 1 }, { flow: "phone", weight: 1 }, { flow: "tv", weight: 1 }],
        rate: 2.5,
        tiles: [
          { id: "a", label: "Homes per address", icon: "users", hue: "violet", value: "{homesPerIp}", note: "carrier-grade NAT" },
          { id: "b", label: "Ports each home gets", icon: "blocks", hue: "amber", value: "{portsPerHome}", note: "{homePortsUsedPct} used here", mood: "good", moodIf: { output: "homePortsUsedPct", above: 99, mood: "bad" } },
          { id: "c", label: "The real fix", icon: "check", hue: "green", value: "IPv6", note: "an address for every device" },
        ],
      },
    ],
    widgets: { table: [{ kind: "custom", name: "nat" }] },
  },
};
