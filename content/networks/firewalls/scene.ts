import type { BoardFlow, SceneSpec } from "@tintelix/schema";

const IN = (wire: string, to: string, out: string): BoardFlow["path"] => [{ wire, dir: 1, at: "fw" }, { wire: out, dir: 1, at: to }];

/**
 * Firewalls: the internet on the left (a visitor, the admin at the office, a scanner, an update server),
 * the firewall in the middle, and the company's three services on the right. Below, the firewall's rules.
 */
export const firewallScene: SceneSpec = {
  kind: "board",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 26, w: 984, h: 426 },
  regions: [
    { id: "net", label: "The internet", x: 8, y: 28, w: 200, h: 264 },
    { id: "inside", label: "Inside", x: 740, y: 28, w: 252, h: 264 },
  ],
  nodes: {
    visitor: { x: 20, y: 62, w: 176, h: 44, kind: "users", label: "Visitor", sub: "anyone", slim: true },
    admin: { x: 20, y: 118, w: 176, h: 44, kind: "users", label: "Admin", sub: "198.51.100.9", slim: true },
    scanner: { x: 20, y: 174, w: 176, h: 44, kind: "users", label: "Scanner", sub: "203.0.113.66", slim: true },
    updates: { x: 20, y: 230, w: 176, h: 44, kind: "origin", label: "Updates", sub: "a server", slim: true },
    fw: { x: 380, y: 110, w: 200, h: 120, kind: "edge", label: "Firewall", sub: "checks every packet" },
    web: { x: 756, y: 62, w: 220, h: 60, kind: "app", label: "Web server", sub: "port 443" },
    ssh: { x: 756, y: 140, w: 220, h: 60, kind: "app", label: "SSH", sub: "port 22" },
    db: { x: 756, y: 218, w: 220, h: 60, kind: "db", label: "Database", sub: "port 5432" },
    rules: { x: 20, y: 302, w: 960, h: 148, kind: "curve", label: "The firewall's rules", sub: "first match decides" },
  },
  wires: {
    v_f: { from: [196, 84], to: [380, 140] },
    a_f: { from: [196, 140], to: [380, 160] },
    x_f: { from: [196, 196], to: [380, 180] },
    u_f: { from: [196, 252], to: [380, 200] },
    f_web: { from: [580, 140], to: [756, 92] },
    f_ssh: { from: [580, 170], to: [756, 170] },
    f_db: { from: [580, 200], to: [756, 248] },
  },
  board: {
    legend: [["cyan", "allowed in"], ["amber", "probe"], ["green", "reply"], ["violet", "started inside"], ["red", "dropped"]],
    flows: {
      visit: { from: "visitor", path: IN("v_f", "web", "f_web"), color: "cyan", back: "green" },
      admin: { from: "admin", path: IN("a_f", "ssh", "f_ssh"), color: "cyan", back: "green" },
      scanSsh: { from: "scanner", path: IN("x_f", "ssh", "f_ssh"), color: "amber", back: "green", fail: { at: "fw", share: "scanBlockedPct" } },
      scanDb: { from: "scanner", path: IN("x_f", "db", "f_db"), color: "amber", back: "green", fail: { at: "fw", share: "scanBlockedPct" }, float: { at: "db", text: "wide open", color: "red", chance: 0.5 } },
      update: { from: "web", path: [{ wire: "f_web", dir: -1, at: "fw" }, { wire: "u_f", dir: -1, at: "updates" }], color: "violet" },
      updateReply: {
        from: "updates",
        path: [{ wire: "u_f", dir: 1, at: "fw" }, { wire: "f_web", dir: 1, at: "web" }],
        color: "green",
        fail: { at: "fw", share: "replyBlockedPct" }
      },
    },
    modes: [
      {
        flows: [{ flow: "visit", weight: 2 }, { flow: "admin", weight: 1 }, { flow: "scanSsh", weight: 2 }, { flow: "scanDb", weight: 2 }],
        rate: 2.5,
        tiles: [
          { id: "a", label: "Ports open to all", icon: "alert", hue: "amber", value: "{exposedPorts}", note: "web, SSH, database", mood: "bad" },
          { id: "b", label: "Probes reaching a service", icon: "activity", hue: "violet", value: "{reachedPerMin}/min", note: "of {probesPerMin}" },
          { id: "c", label: "Database", icon: "db", hue: "cyan", value: "Reachable", note: "by anyone", mood: "bad" },
        ],
      },
      {
        flows: [{ flow: "visit", weight: 2 }, { flow: "admin", weight: 1 }, { flow: "scanSsh", weight: 2 }, { flow: "scanDb", weight: 2 }, { flow: "update", weight: 1 }, { flow: "updateReply", weight: 1 }],
        rate: 3,
        tiles: [
          { id: "a", label: "Ports open to all", icon: "check", hue: "green", value: "{exposedPorts}", note: "443; SSH for the office only", mood: "good" },
          { id: "b", label: "Probes dropped", icon: "alert", hue: "amber", value: "{blockedPerMin}/min", note: "of {probesPerMin}" },
          { id: "c", label: "Update replies", icon: "alert", hue: "violet", value: "Dropped", note: "they look like strangers", mood: "bad" },
        ],
      },
      {
        flows: [{ flow: "visit", weight: 2 }, { flow: "admin", weight: 1 }, { flow: "scanSsh", weight: 2 }, { flow: "scanDb", weight: 2 }, { flow: "update", weight: 1 }, { flow: "updateReply", weight: 1 }],
        rate: 3,
        tiles: [
          { id: "a", label: "Replies let in", icon: "check", hue: "green", value: "Expected ones", note: "matched to their request", mood: "good" },
          { id: "b", label: "Stateless would open", icon: "alert", hue: "amber", value: "{statelessHole} ports", note: "for replies to get in" },
          { id: "c", label: "Stateful opens", icon: "check", hue: "cyan", value: "{statefulHole}", note: "it remembers connections" },
        ],
      },
      {
        flows: [{ flow: "visit", weight: 2 }, { flow: "admin", weight: 1 }, { flow: "scanSsh", weight: 2 }, { flow: "scanDb", weight: 2 }, { flow: "update", weight: 1 }, { flow: "updateReply", weight: 1 }],
        rate: 3,
        tiles: [
          { id: "a", label: "Last rule", icon: "alert", hue: "amber", value: "Drop the rest", note: "default deny" },
          { id: "b", label: "Services running", icon: "server", hue: "violet", value: "{listening}", note: "only one open to all" },
          { id: "c", label: "Probes dropped", icon: "check", hue: "green", value: "{blockedPerMin}/min", note: "of {probesPerMin}", mood: "good" },
        ],
      },
      {
        flows: [{ flow: "visit", weight: 2 }, { flow: "admin", weight: 1 }, { flow: "scanSsh", weight: 2 }, { flow: "scanDb", weight: 2 }, { flow: "update", weight: 1 }, { flow: "updateReply", weight: 1 }],
        rate: 3,
        tiles: [
          { id: "a", label: "Network firewall", icon: "shuffle", hue: "cyan", value: "Layers 3–4", note: "addresses, ports, state" },
          { id: "b", label: "Web app firewall", icon: "spark", hue: "violet", value: "Layer 7", note: "reads the HTTP itself" },
          { id: "c", label: "Cloud version", icon: "blocks", hue: "amber", value: "Security groups", note: "a firewall per server" },
        ],
      },
    ],
    widgets: { rules: [{ kind: "custom", name: "fwrules" }] },
  },
};
