import type { SceneSpec } from "@tintelix/schema";

/**
 * IP addressing: a laptop and a phone at home with private addresses, the home router that holds the
 * one public address, and a server across the internet. Below, the laptop's address in decimal and in
 * bits, split into network and host parts.
 */
export const ipScene: SceneSpec = {
  kind: "board",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 28, w: 984, h: 418 },
  regions: [
    { id: "home", label: "Your home · private addresses", x: 8, y: 34, w: 404, h: 226 },
    { id: "internet", label: "The internet · public addresses", x: 424, y: 34, w: 568, h: 226 },
  ],
  nodes: {
    laptop: { x: 24, y: 66, w: 200, h: 80, kind: "users", label: "Laptop", sub: "192.168.1.42" },
    phone: { x: 24, y: 164, w: 200, h: 80, kind: "users", label: "Phone", sub: "192.168.1.43" },
    router: { x: 304, y: 112, w: 220, h: 86, kind: "lb", label: "Home router", sub: "public 203.0.113.10" },
    server: { x: 770, y: 112, w: 206, h: 86, kind: "origin", label: "Server", sub: "198.51.100.7" },
    bits: { x: 24, y: 272, w: 952, h: 166, kind: "curve", label: "The laptop's address", sub: "32 bits, network part then host part" },
  },
  wires: {
    l_r: { from: [224, 106], to: [304, 146] },
    p_r: { from: [224, 204], to: [304, 166] },
    r_s: { from: [524, 155], to: [770, 155], label: "the internet" },
  },
  board: {
    legend: [["cyan", "request"], ["green", "reply"]],
    flows: {
      laptop: { from: "laptop", path: [{ wire: "l_r", dir: 1, at: "router" }, { wire: "r_s", dir: 1, at: "server" }], color: "cyan", back: "green" },
      phone: { from: "phone", path: [{ wire: "p_r", dir: 1, at: "router" }, { wire: "r_s", dir: 1, at: "server" }], color: "cyan", back: "green" },
      laptopSeen: {
        from: "laptop",
        path: [{ wire: "l_r", dir: 1, at: "router" }, { wire: "r_s", dir: 1, at: "server" }],
        color: "cyan",
        back: "green",
        float: { at: "server", text: "from 203.0.113.10", color: "amber", chance: 0.6 },
      },
      phoneSeen: {
        from: "phone",
        path: [{ wire: "p_r", dir: 1, at: "router" }, { wire: "r_s", dir: 1, at: "server" }],
        color: "cyan",
        back: "green",
        float: { at: "server", text: "from 203.0.113.10", color: "amber", chance: 0.6 },
      },
    },
    modes: [
      {
        flows: [{ flow: "laptop", weight: 1 }],
        rate: 0.8,
        tiles: [
          { id: "a", label: "Your laptop", icon: "target", hue: "cyan", value: "192.168.1.42", note: "in every packet it sends" },
          { id: "b", label: "Size", icon: "blocks", hue: "violet", value: "32 bits", note: "four numbers, 0 to 255" },
          { id: "c", label: "IPv4 addresses", icon: "spark", hue: "amber", value: "{ipv4B} billion", note: "in the whole world" },
        ],
      },
      {
        flows: [{ flow: "laptop", weight: 1 }],
        rate: 0.8,
        tiles: [
          { id: "a", label: "Prefix", icon: "target", hue: "cyan", value: "/{prefixLen}", note: "network bits" },
          { id: "b", label: "Network part", icon: "blocks", hue: "cyan", value: "{networkBits} bits", note: "which network" },
          { id: "c", label: "Host part", icon: "blocks", hue: "amber", value: "{hostBits} bits", note: "which device on it" },
        ],
      },
      {
        flows: [{ flow: "laptop", weight: 1 }],
        rate: 0.8,
        tiles: [
          { id: "a", label: "Prefix", icon: "target", hue: "cyan", value: "/{prefixLen}", note: "{hostBits} host bits" },
          { id: "b", label: "Addresses", icon: "blocks", hue: "violet", value: "{addresses}", note: "2 to the power {hostBits}" },
          { id: "c", label: "For devices", icon: "users", hue: "green", value: "{hosts}", note: "less network and broadcast" },
        ],
      },
      {
        flows: [{ flow: "laptopSeen", weight: 1 }, { flow: "phoneSeen", weight: 1 }],
        rate: 1.2,
        tiles: [
          { id: "a", label: "Private ranges", icon: "list", hue: "violet", value: "3", note: "10/8, 172.16/12, 192.168/16" },
          { id: "b", label: "Private addresses", icon: "blocks", hue: "cyan", value: "{privateM} million", note: "reused in every home" },
          { id: "c", label: "Server sees", icon: "target", hue: "amber", value: "203.0.113.10", note: "the router, not the laptop" },
        ],
      },
      {
        flows: [{ flow: "laptop", weight: 1 }, { flow: "phone", weight: 1 }],
        rate: 1.2,
        tiles: [
          { id: "a", label: "IPv6 size", icon: "blocks", hue: "violet", value: "128 bits", note: "eight groups of 16" },
          { id: "b", label: "IPv6 addresses", icon: "spark", hue: "cyan", value: "{ipv6Mant} × 10^{ipv6Exp}", note: "vs {ipv4B} billion" },
          { id: "c", label: "IPv4 per person", icon: "users", hue: "amber", value: "{v4PerPerson}", note: "IPv6: 10^{v6PerPersonExp} each" },
        ],
      },
    ],
    widgets: { bits: [{ kind: "custom", name: "ipbits" }] },
  },
};
