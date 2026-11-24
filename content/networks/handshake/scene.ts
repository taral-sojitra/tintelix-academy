import type { BoardFlow, SceneSpec } from "@tintelix/schema";

const out = (text: string, color: BoardFlow["color"]): BoardFlow => ({
  from: "client",
  path: [{ wire: "c_s", dir: 1, at: "server" }],
  color,
  float: { at: "server", text, color, chance: 1 },
});
const back = (text: string, color: BoardFlow["color"]): BoardFlow => ({
  from: "server",
  path: [{ wire: "c_s", dir: -1, at: "client" }],
  color,
  float: { at: "client", text, color, chance: 1 },
});
const seq = (...names: string[]) => names.map((flow) => ({ flow, weight: 1 }));

/**
 * The three-way handshake: a browser on the left, a server on the right, one long wire between them.
 * Each message plays in order, named as it arrives. Below, the same exchange as a ladder with times.
 */
export const handshakeScene: SceneSpec = {
  kind: "board",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 40, w: 984, h: 410 },
  nodes: {
    client: { x: 30, y: 64, w: 220, h: 84, kind: "users", label: "Your browser", sub: "the client" },
    server: { x: 750, y: 64, w: 220, h: 84, kind: "origin", label: "Server", sub: "listening" },
    ladder: { x: 30, y: 176, w: 940, h: 270, kind: "curve", label: "The ladder", sub: "time runs down the page" },
  },
  wires: { c_s: { from: [250, 106], to: [750, 106], label: "one way: half a round trip" } },
  board: {
    legend: [["cyan", "client to server"], ["green", "server to client"], ["amber", "your request"], ["violet", "closing"]],
    flows: {
      syn: out("SYN", "cyan"),
      synack: back("SYN-ACK", "green"),
      ack: out("ACK", "cyan"),
      ackGet: out("ACK + GET /", "amber"),
      page: back("200 OK", "green"),
      fin: out("FIN", "violet"),
      finAck: back("ACK", "violet"),
      fin2: back("FIN", "violet"),
      ack2: out("ACK", "violet"),
    },
    modes: [
      {
        flows: [],
        tiles: [
          { id: "a", label: "TCP promises", icon: "check", hue: "cyan", value: "Every byte", note: "numbered, in order" },
          { id: "b", label: "Both sides need", icon: "list", hue: "violet", value: "A start number", note: "and proof the other is there" },
          { id: "c", label: "Round trip", icon: "timer", hue: "amber", value: "{rttMs}", note: "there and back" },
        ],
      },
      {
        flows: seq("syn", "synack", "ack"),
        sequence: true,
        rate: 1.2,
        tiles: [
          { id: "a", label: "Messages", icon: "list", hue: "violet", value: "3", note: "SYN, SYN-ACK, ACK" },
          { id: "b", label: "Connected after", icon: "timer", hue: "cyan", value: "{handshakeMs}", note: "one round trip" },
          { id: "c", label: "Data sent", icon: "blocks", hue: "amber", value: "None yet", note: "just numbers agreed" },
        ],
      },
      {
        flows: seq("syn", "synack", "ackGet", "page"),
        sequence: true,
        rate: 1.2,
        tiles: [
          { id: "a", label: "Request leaves at", icon: "timer", hue: "amber", value: "{handshakeMs}", note: "riding with the ACK" },
          { id: "b", label: "First byte back", icon: "timer", hue: "green", value: "{firstByteMs}", note: "two round trips" },
          { id: "c", label: "Spent on setup", icon: "gauge", hue: "violet", value: "Half", note: "of the wait" },
        ],
      },
      {
        flows: seq("fin", "finAck", "fin2", "ack2"),
        sequence: true,
        rate: 1.2,
        tiles: [
          { id: "a", label: "Messages", icon: "list", hue: "violet", value: "4", note: "FIN and ACK, each way" },
          { id: "b", label: "Each side closes", icon: "check", hue: "cyan", value: "Its own half", note: "sending stops one way" },
          { id: "c", label: "Takes", icon: "timer", hue: "amber", value: "{handshakeMs}", note: "about a round trip" },
        ],
      },
      {
        flows: seq("syn", "synack", "ackGet", "page", "ackGet", "page", "ackGet", "page"),
        sequence: true,
        rate: 1.5,
        tiles: [
          { id: "a", label: "New connection each", icon: "alert", hue: "amber", value: "{newEachMs}", note: "{requests} requests", mood: "bad" },
          { id: "b", label: "One connection", icon: "check", hue: "green", value: "{reusedMs}", note: "one handshake", mood: "good" },
          { id: "c", label: "Faster by", icon: "gauge", hue: "violet", value: "{savedPct}", note: "{savedMs} saved" },
        ],
      },
    ],
    widgets: { ladder: [{ kind: "custom", name: "ladder" }] },
  },
};
