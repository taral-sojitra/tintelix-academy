import type { SceneSpec } from "@tintelix/schema";

const ASK = { wire: "l_s", dir: 1 as const, at: "sw" };

/**
 * MAC addresses and ARP: the laptop on the left, the switch in the middle, and three devices on the same
 * network (the router, a phone, a TV) on the right. The ARP question goes to all three; only the router
 * answers. Below, the exchange and the laptop's ARP cache.
 */
export const arpScene: SceneSpec = {
  kind: "board",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 26, w: 984, h: 426 },
  regions: [{ id: "lan", label: "One home network · one switch", x: 8, y: 28, w: 984, h: 258 }],
  nodes: {
    laptop: { x: 30, y: 118, w: 220, h: 80, kind: "users", label: "Laptop .42", sub: "02:1a:2b:3c:4d:5e" },
    sw: { x: 400, y: 118, w: 190, h: 80, kind: "services", label: "Switch", sub: "forwards by MAC" },
    router: { x: 750, y: 50, w: 222, h: 72, kind: "lb", label: "Router .1", sub: "02:aa:bb:cc:dd:01" },
    phone: { x: 750, y: 130, w: 222, h: 72, kind: "users", label: "Phone .43", sub: "02:7c:11:e0:42:9b" },
    tv: { x: 750, y: 210, w: 222, h: 72, kind: "users", label: "TV .50", sub: "02:5d:03:b8:6a:20" },
    arp: { x: 30, y: 294, w: 940, h: 156, kind: "curve", label: "The laptop's side", sub: "what it sends, hears and keeps" },
  },
  wires: {
    l_s: { from: [250, 158], to: [400, 158] },
    s_r: { from: [590, 144], to: [750, 86] },
    s_p: { from: [590, 158], to: [750, 166] },
    s_t: { from: [590, 172], to: [750, 246] },
  },
  board: {
    legend: [["amber", "ARP question (to everyone)"], ["green", "ARP answer"], ["cyan", "your data"], ["violet", "ignored"]],
    flows: {
      askRouter: { from: "laptop", path: [ASK, { wire: "s_r", dir: 1, at: "router" }], color: "amber", float: { at: "router", text: "that's me", color: "green", chance: 1 } },
      askPhone: { from: "laptop", path: [ASK, { wire: "s_p", dir: 1, at: "phone" }], color: "amber", float: { at: "phone", text: "not me", color: "violet", chance: 1 } },
      askTv: { from: "laptop", path: [ASK, { wire: "s_t", dir: 1, at: "tv" }], color: "amber", float: { at: "tv", text: "not me", color: "violet", chance: 1 } },
      answer: {
        from: "router",
        path: [{ wire: "s_r", dir: -1, at: "sw" }, { wire: "l_s", dir: -1, at: "laptop" }],
        color: "green",
        float: { at: "laptop", text: "cached", color: "green", chance: 1 },
      },
      data: { from: "laptop", path: [ASK, { wire: "s_r", dir: 1, at: "router" }], color: "cyan", back: "green" },
    },
    modes: [
      {
        flows: [],
        tiles: [
          { id: "a", label: "Laptop knows", icon: "target", hue: "cyan", value: "192.168.1.1", note: "the router's IP address" },
          { id: "b", label: "Ethernet needs", icon: "blocks", hue: "amber", value: "A MAC address", note: "48 bits, one per network card" },
          { id: "c", label: "Devices here", icon: "users", hue: "violet", value: "{devices}", note: "on one switch" },
        ],
      },
      {
        flows: [{ flow: "askRouter", weight: 1 }, { flow: "askPhone", weight: 1 }, { flow: "askTv", weight: 1 }, { flow: "answer", weight: 1 }],
        sequence: true,
        rate: 2.5,
        tiles: [
          { id: "a", label: "Question to", icon: "users", hue: "amber", value: "Everyone", note: "ff:ff:ff:ff:ff:ff" },
          { id: "b", label: "Devices that read it", icon: "users", hue: "violet", value: "{askedDevices}", note: "all but the laptop" },
          { id: "c", label: "Answers", icon: "check", hue: "green", value: "1", note: "only the router, only to the laptop" },
        ],
      },
      {
        flows: [{ flow: "data", weight: 1 }],
        rate: 2,
        tiles: [
          { id: "a", label: "Cached for", icon: "timer", hue: "green", value: "{cacheSec} s", note: "then it asks again" },
          { id: "b", label: "Broadcasts now", icon: "users", hue: "violet", value: "0", note: "until the entry expires" },
          { id: "c", label: "Packets", icon: "activity", hue: "cyan", value: "{packetsPerMin}/min", note: "straight to the router's MAC" },
        ],
      },
      {
        flows: [{ flow: "askRouter", weight: 1 }, { flow: "askPhone", weight: 1 }, { flow: "askTv", weight: 1 }, { flow: "answer", weight: 1 }, { flow: "data", weight: 1 }],
        sequence: true,
        rate: 3,
        tiles: [
          { id: "a", label: "No cache", icon: "alert", hue: "amber", value: "{noiseNoCache}/min", note: "frames others must read", mood: "bad" },
          { id: "b", label: "With a cache", icon: "check", hue: "green", value: "{noiseCached}/min", note: "one question every {cacheSec} s", mood: "good" },
          { id: "c", label: "Saved", icon: "gauge", hue: "violet", value: "{savedPct}", note: "of the broadcast noise" },
        ],
      },
    ],
    widgets: { arp: [{ kind: "custom", name: "arp" }] },
  },
};
