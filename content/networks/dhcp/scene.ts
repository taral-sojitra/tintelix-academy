import type { SceneSpec } from "@tintelix/schema";

const P_AP = { wire: "p_a", dir: 1 as const, at: "ap" };
const TO_PHONE = { wire: "p_a", dir: -1 as const, at: "phone" };

/**
 * DHCP: a phone that has just joined the café Wi-Fi on the left, the access point in the middle, and on
 * the right the router (which runs the DHCP server) and two devices that already have addresses. The
 * phone's broadcasts reach all three; only the router answers. Below, the four messages and the phone's
 * settings.
 */
export const dhcpScene: SceneSpec = {
  kind: "board",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 26, w: 984, h: 426 },
  regions: [{ id: "cafe", label: "Café Wi-Fi · 192.168.1.0/24", x: 8, y: 28, w: 984, h: 234 }],
  nodes: {
    phone: { x: 30, y: 108, w: 220, h: 76, kind: "users", label: "Phone", sub: "just joined, no IP" },
    ap: { x: 400, y: 108, w: 200, h: 76, kind: "services", label: "Access point", sub: "the Wi-Fi" },
    router: { x: 750, y: 46, w: 222, h: 64, kind: "lb", label: "Router .1", sub: "runs the DHCP server" },
    laptop: { x: 750, y: 116, w: 222, h: 64, kind: "users", label: "Laptop .42", sub: "has an address" },
    tv: { x: 750, y: 186, w: 222, h: 64, kind: "users", label: "TV .50", sub: "has an address" },
    dora: { x: 30, y: 270, w: 940, h: 180, kind: "curve", label: "The phone's side", sub: "messages, then its settings" },
  },
  wires: {
    p_a: { from: [250, 146], to: [400, 146] },
    a_r: { from: [600, 132], to: [750, 78] },
    a_l: { from: [600, 146], to: [750, 148] },
    a_t: { from: [600, 160], to: [750, 218] },
  },
  board: {
    legend: [["amber", "to everyone"], ["green", "to the phone"], ["cyan", "the phone's data"], ["red", "no address left"]],
    flows: {
      discover: { from: "phone", path: [P_AP, { wire: "a_r", dir: 1, at: "router" }], color: "amber", float: { at: "router", text: "DISCOVER", color: "amber", chance: 1 } },
      discoverL: { from: "phone", path: [P_AP, { wire: "a_l", dir: 1, at: "laptop" }], color: "amber" },
      discoverT: { from: "phone", path: [P_AP, { wire: "a_t", dir: 1, at: "tv" }], color: "amber" },
      offer: { from: "router", path: [{ wire: "a_r", dir: -1, at: "ap" }, TO_PHONE], color: "green", float: { at: "phone", text: "OFFER .101", color: "green", chance: 1 } },
      request: { from: "phone", path: [P_AP, { wire: "a_r", dir: 1, at: "router" }], color: "amber", float: { at: "router", text: "REQUEST .101", color: "amber", chance: 1 } },
      requestL: { from: "phone", path: [P_AP, { wire: "a_l", dir: 1, at: "laptop" }], color: "amber" },
      ack: { from: "router", path: [{ wire: "a_r", dir: -1, at: "ap" }, TO_PHONE], color: "green", float: { at: "phone", text: "ACK · {leaseHours} h", color: "green", chance: 1 } },
      data: { from: "phone", path: [P_AP, { wire: "a_r", dir: 1, at: "router" }], color: "cyan", back: "green" },
      join: {
        from: "phone",
        path: [P_AP, { wire: "a_r", dir: 1, at: "router" }],
        color: "amber",
        back: "green",
        fail: { at: "router", share: "failPct" },
      },
    },
    modes: [
      {
        flows: [],
        tiles: [
          { id: "a", label: "Phone's IP", icon: "target", hue: "amber", value: "None", note: "only its MAC address" },
          { id: "b", label: "Needs", icon: "list", hue: "violet", value: "4 settings", note: "IP, mask, gateway, DNS" },
          { id: "c", label: "Can't yet", icon: "alert", hue: "cyan", value: "ARP or route", note: "it doesn't know its subnet" },
        ],
      },
      {
        flows: ["discover", "discoverL", "discoverT", "offer", "request", "requestL", "ack"].map((flow) => ({ flow, weight: 1 })),
        sequence: true,
        rate: 2.5,
        tiles: [
          { id: "a", label: "Messages", icon: "list", hue: "violet", value: "{messages}", note: "discover, offer, request, ack" },
          { id: "b", label: "To everyone", icon: "users", hue: "amber", value: "2", note: "the phone has no address yet" },
          { id: "c", label: "Lease", icon: "timer", hue: "green", value: "{leaseHours} h", note: "the address is lent, not given" },
        ],
      },
      {
        flows: [{ flow: "data", weight: 1 }],
        rate: 2,
        tiles: [
          { id: "a", label: "Phone's IP", icon: "target", hue: "green", value: ".101", note: "192.168.1.101 for {leaseHours} h" },
          { id: "b", label: "Renews at", icon: "timer", hue: "violet", value: "{renewHours} h", note: "half the lease" },
          { id: "c", label: "Gateway, DNS", icon: "shuffle", hue: "cyan", value: "192.168.1.1", note: "both the router here" },
        ],
      },
      {
        flows: [{ flow: "join", weight: 1 }],
        rate: 2,
        tiles: [
          { id: "a", label: "Addresses held", icon: "blocks", hue: "violet", value: "{held}", note: "of {poolSize} in the pool" },
          { id: "b", label: "Pool used", icon: "gauge", hue: "amber", value: "{poolUsedPct}", note: "{visitorsPerDay} visitors a day", mood: "good", moodIf: { output: "failPct", above: 0, mood: "bad" } },
          { id: "c", label: "Newcomers refused", icon: "alert", hue: "cyan", value: "{failPct}", note: "no address left", mood: "good", moodIf: { output: "failPct", above: 0, mood: "bad" } },
        ],
      },
    ],
    widgets: { dora: [{ kind: "custom", name: "dhcp" }] },
  },
};
