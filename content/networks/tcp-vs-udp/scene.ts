import type { SceneSpec } from "@tintelix/schema";

const TCP_PATH = [{ wire: "tc_n", dir: 1 as const, at: "tnet" }, { wire: "tn_s", dir: 1 as const, at: "tcpS" }];
const UDP_PATH = [{ wire: "uc_n", dir: 1 as const, at: "unet" }, { wire: "un_s", dir: 1 as const, at: "udpS" }];

/**
 * TCP vs UDP: two lanes over the same lossy internet. Top, a file download over TCP: every segment is
 * acknowledged and lost ones are resent. Middle, a voice call over UDP: lost packets are simply gone.
 * Below, what each receiver hands its app when packet 4 is lost.
 */
export const tcpUdpScene: SceneSpec = {
  kind: "board",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 26, w: 984, h: 426 },
  regions: [
    { id: "tcp", label: "TCP · a file download", x: 8, y: 28, w: 984, h: 124 },
    { id: "udp", label: "UDP · a voice call", x: 8, y: 158, w: 984, h: 124 },
  ],
  nodes: {
    tcpC: { x: 30, y: 64, w: 220, h: 70, kind: "users", label: "Laptop", sub: "downloading a file" },
    tnet: { x: 390, y: 64, w: 220, h: 70, kind: "edge", label: "The internet", sub: "loses some packets" },
    tcpS: { x: 750, y: 64, w: 220, h: 70, kind: "origin", label: "File server", sub: "sends segments" },
    udpC: { x: 30, y: 194, w: 220, h: 70, kind: "users", label: "Phone", sub: "on a voice call" },
    unet: { x: 390, y: 194, w: 220, h: 70, kind: "edge", label: "The internet", sub: "loses some packets" },
    udpS: { x: 750, y: 194, w: 220, h: 70, kind: "users", label: "Friend's phone", sub: "playing the audio" },
    order: { x: 30, y: 292, w: 940, h: 158, kind: "curve", label: "What each app receives", sub: "packet 4 is lost" },
  },
  wires: {
    tc_n: { from: [250, 99], to: [390, 99] },
    tn_s: { from: [610, 99], to: [750, 99] },
    uc_n: { from: [250, 229], to: [390, 229] },
    un_s: { from: [610, 229], to: [750, 229] },
  },
  board: {
    legend: [["cyan", "TCP segment"], ["green", "ACK"], ["amber", "resent"], ["violet", "UDP datagram"], ["red", "lost"]],
    flows: {
      tcp: { from: "tcpC", path: TCP_PATH, color: "cyan", back: "green", fail: { at: "tnet", share: "lossPct" } },
      resend: { from: "tcpC", path: TCP_PATH, color: "amber", back: "green", float: { at: "tcpS", text: "resent", color: "amber", chance: 0.6 } },
      udp: { from: "udpC", path: UDP_PATH, color: "violet", fail: { at: "unet", share: "lossPct" } },
    },
    modes: [
      {
        flows: [{ flow: "tcp", weight: 1 }, { flow: "udp", weight: 1 }],
        rate: 2.5,
        tiles: [
          { id: "a", label: "TCP promises", icon: "check", hue: "cyan", value: "Every byte", note: "in order, or an error" },
          { id: "b", label: "UDP promises", icon: "bolt", hue: "violet", value: "Nothing", note: "it just sends, fast" },
          { id: "c", label: "Header", icon: "blocks", hue: "amber", value: "{tcpHeader} vs {udpHeader} bytes", note: "TCP vs UDP" },
        ],
      },
      {
        flows: [{ flow: "tcp", weight: 100 }, { flow: "resend", weight: "lossPct" }, { flow: "udp", weight: 100 }],
        rate: 3,
        tiles: [
          { id: "a", label: "Lost on the way", icon: "alert", hue: "amber", value: "{lossPct}", note: "the same in both lanes" },
          { id: "b", label: "TCP delivers", icon: "check", hue: "cyan", value: "{tcpDeliveredPct}", note: "resending {resendPct}", mood: "good" },
          { id: "c", label: "UDP delivers", icon: "bolt", hue: "violet", value: "{udpDeliveredPct}", note: "the rest are gone" },
        ],
      },
      {
        flows: [{ flow: "tcp", weight: 100 }, { flow: "resend", weight: "lossPct" }, { flow: "udp", weight: 100 }],
        rate: 3,
        tiles: [
          { id: "a", label: "TCP stall per loss", icon: "timer", hue: "amber", value: "{stallMs}", note: "1.5 round trips of {rttMs}" },
          { id: "b", label: "Call frozen on TCP", icon: "alert", hue: "cyan", value: "{tcpFrozenPct}", note: "of the time", mood: "bad" },
          { id: "c", label: "Audio missing on UDP", icon: "bolt", hue: "violet", value: "{udpGapPct}", note: "in 20 ms gaps", mood: "good" },
        ],
      },
    ],
    widgets: { order: [{ kind: "custom", name: "order" }] },
    subs: { tnet: "loses {lossPct}", unet: "loses {lossPct}" },
  },
};
