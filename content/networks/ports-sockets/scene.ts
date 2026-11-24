import type { BoardFlow, SceneSpec } from "@tintelix/schema";

const via = (from: string, wire: string, out: string, to: string, color: BoardFlow["color"], extra: Partial<BoardFlow> = {}): BoardFlow => ({
  from,
  path: [{ wire, dir: 1, at: "server" }, { wire: out, dir: 1, at: to }],
  color,
  back: "green",
  ...extra,
});

/**
 * Ports and sockets: four clients on the left, one server address in the middle (its operating system
 * and socket table), and three programs on the right, each on its own port. The OS reads each packet's
 * port and hands it to the right program.
 */
export const portsScene: SceneSpec = {
  kind: "board",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 30, w: 984, h: 420 },
  nodes: {
    laptop: { x: 20, y: 50, w: 220, h: 72, kind: "users", label: "Laptop, 2 tabs", sub: "198.51.100.7" },
    phone: { x: 20, y: 146, w: 220, h: 72, kind: "users", label: "Phone", sub: "198.51.100.9" },
    admin: { x: 20, y: 242, w: 220, h: 72, kind: "users", label: "Admin's laptop", sub: "198.51.100.20" },
    app: { x: 20, y: 338, w: 220, h: 72, kind: "app", label: "App server", sub: "198.51.100.30" },
    server: { x: 300, y: 70, w: 400, h: 330, kind: "services", label: "Server 203.0.113.5", sub: "its operating system's socket table" },
    web: { x: 760, y: 80, w: 220, h: 72, kind: "app", label: "Web server", sub: "port 443" },
    ssh: { x: 760, y: 200, w: 220, h: 72, kind: "app", label: "SSH", sub: "port 22" },
    db: { x: 760, y: 320, w: 220, h: 72, kind: "db", label: "Database", sub: "port 5432" },
  },
  wires: {
    l_s: { from: [240, 86], to: [300, 130] },
    p_s: { from: [240, 182], to: [300, 200] },
    a_s: { from: [240, 278], to: [300, 270] },
    x_s: { from: [240, 374], to: [300, 340] },
    s_web: { from: [700, 130], to: [760, 116] },
    s_ssh: { from: [700, 236], to: [760, 236] },
    s_db: { from: [700, 340], to: [760, 356] },
  },
  board: {
    legend: [["cyan", "to port 443"], ["violet", "to port 22"], ["amber", "to port 5432"], ["green", "reply"], ["red", "no free port"]],
    flows: {
      tab1: via("laptop", "l_s", "s_web", "web", "cyan", { float: { at: "web", text: ":443", color: "cyan", chance: 0.25 } }),
      tab2: via("laptop", "l_s", "s_web", "web", "cyan"),
      phone: via("phone", "p_s", "s_web", "web", "cyan"),
      admin: via("admin", "a_s", "s_ssh", "ssh", "violet", { float: { at: "ssh", text: ":22", color: "violet", chance: 0.3 } }),
      app: via("app", "x_s", "s_db", "db", "amber", { fail: { at: "server", share: "failPct" } }),
    },
    modes: [
      {
        flows: [{ flow: "tab1", weight: 1 }, { flow: "phone", weight: 1 }, { flow: "admin", weight: 1 }, { flow: "app", weight: 1 }],
        rate: 2,
        tiles: [
          { id: "a", label: "Server address", icon: "target", hue: "cyan", value: "1", note: "203.0.113.5" },
          { id: "b", label: "Programs on it", icon: "server", hue: "violet", value: "3", note: "web, SSH, database" },
          { id: "c", label: "IP gets a packet", icon: "shuffle", hue: "amber", value: "To the machine", note: "not to a program" },
        ],
      },
      {
        flows: [{ flow: "tab1", weight: 1 }, { flow: "phone", weight: 1 }, { flow: "admin", weight: 1 }, { flow: "app", weight: 1 }],
        rate: 2,
        tiles: [
          { id: "a", label: "Ports", icon: "blocks", hue: "violet", value: "{totalPorts}", note: "16 bits, 0 to 65,535" },
          { id: "b", label: "Well known", icon: "list", hue: "cyan", value: "Below {wellKnown}", note: "443 web, 22 SSH, 53 DNS" },
          { id: "c", label: "Listening here", icon: "server", hue: "amber", value: "3", note: "443, 22, 5432" },
        ],
      },
      {
        flows: [{ flow: "tab1", weight: 1 }, { flow: "tab2", weight: 1 }, { flow: "phone", weight: 1 }, { flow: "admin", weight: 1 }, { flow: "app", weight: 1 }],
        rate: 2.5,
        tiles: [
          { id: "a", label: "Connections", icon: "activity", hue: "cyan", value: "5", note: "to one address" },
          { id: "b", label: "Same laptop, port 443", icon: "users", hue: "amber", value: "2", note: "source ports 51000, 51001" },
          { id: "c", label: "Told apart by", icon: "target", hue: "violet", value: "5 values", note: "protocol, both IPs and ports" },
        ],
      },
      {
        flows: [{ flow: "tab1", weight: 1 }, { flow: "phone", weight: 1 }, { flow: "admin", weight: 1 }, { flow: "app", weight: 5 }],
        rate: 3,
        tiles: [
          { id: "a", label: "Ports held", icon: "blocks", hue: "amber", value: "{portsInUse}", note: "of {ephemeralPorts} client ports" },
          { id: "b", label: "Used", icon: "gauge", hue: "violet", value: "{portsUsedPct}", note: "{timeWaitSec} s TIME_WAIT each", mood: "good", moodIf: { output: "failPct", above: 0, mood: "bad" } },
          { id: "c", label: "New connections fail", icon: "alert", hue: "cyan", value: "{failPct}", note: "limit {maxRate} a second", mood: "good", moodIf: { output: "failPct", above: 0, mood: "bad" } },
        ],
      },
    ],
    widgets: { server: [{ kind: "custom", name: "sockets" }] },
  },
};
