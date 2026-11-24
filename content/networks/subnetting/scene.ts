import type { SceneSpec } from "@tintelix/schema";

const FLOWS = [{ flow: "direct", weight: "samePct" }, { flow: "via", weight: "diffPct" }];

/**
 * Subnetting: host A and host B on one switch, with the router that joins subnets below it. When the
 * mask puts them in the same subnet, A's packets go straight across the switch; otherwise they detour
 * through the router. Below, the /24 cut into subnets with both hosts marked.
 */
export const subnetScene: SceneSpec = {
  kind: "board",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 36, w: 984, h: 412 },
  nodes: {
    hostA: { x: 30, y: 58, w: 210, h: 80, kind: "users", label: "Host A", sub: "192.168.1.42" },
    sw: { x: 395, y: 58, w: 210, h: 80, kind: "services", label: "Switch", sub: "one network" },
    hostB: { x: 760, y: 58, w: 210, h: 80, kind: "users", label: "Host B", sub: "192.168.1.100" },
    router: { x: 395, y: 182, w: 210, h: 70, kind: "lb", label: "Router", sub: "the default gateway" },
    split: { x: 30, y: 270, w: 940, h: 172, kind: "curve", label: "192.168.1.0/24", sub: "cut into subnets" },
  },
  wires: {
    a_s: { from: [240, 98], to: [395, 98] },
    s_b: { from: [605, 98], to: [760, 98] },
    s_r: { from: [500, 138], to: [500, 182], straight: true },
  },
  board: {
    legend: [["cyan", "same subnet: direct"], ["amber", "different subnet: via the router"], ["green", "reply"]],
    flows: {
      direct: { from: "hostA", path: [{ wire: "a_s", dir: 1, at: "sw" }, { wire: "s_b", dir: 1, at: "hostB" }], color: "cyan", back: "green" },
      via: {
        from: "hostA",
        path: [{ wire: "a_s", dir: 1, at: "sw" }, { wire: "s_r", dir: 1, at: "router" }, { wire: "s_r", dir: -1, at: "sw" }, { wire: "s_b", dir: 1, at: "hostB" }],
        color: "amber",
        back: "green",
        float: { at: "router", text: "another subnet", color: "amber", chance: 0.4 },
      },
    },
    modes: [
      {
        flows: FLOWS,
        rate: 1,
        tiles: [
          { id: "a", label: "Block", icon: "blocks", hue: "violet", value: "/24", note: "192.168.1.0 to .255" },
          { id: "b", label: "Addresses", icon: "spark", hue: "cyan", value: "{subnetSize}", note: "one network for everyone" },
          { id: "c", label: "Teams", icon: "users", hue: "amber", value: "4", note: "staff, guests, cameras, servers" },
        ],
      },
      {
        flows: FLOWS,
        rate: 1,
        tiles: [
          { id: "a", label: "Subnets", icon: "blocks", hue: "violet", value: "{subnets}", note: "/{subPrefix} each" },
          { id: "b", label: "Each holds", icon: "spark", hue: "cyan", value: "{subnetSize}", note: "{usable} for devices" },
          { id: "c", label: "Borrowed bits", icon: "target", hue: "amber", value: "{borrowed}", note: "from the host part" },
        ],
      },
      {
        flows: FLOWS,
        rate: 1,
        tiles: [
          { id: "a", label: "A's subnet", icon: "target", hue: "cyan", value: ".{aNet}/{subPrefix}", note: "42 AND the mask" },
          { id: "b", label: "B's subnet", icon: "target", hue: "amber", value: ".{bNet}/{subPrefix}", note: "{hostB} AND the mask" },
          { id: "c", label: "Router hops", icon: "shuffle", hue: "violet", value: "{routerHops}", note: "0 when they share a subnet" },
        ],
      },
      {
        flows: FLOWS,
        rate: 1,
        tiles: [
          { id: "a", label: "Devices needed", icon: "users", hue: "violet", value: "{needHosts}", note: "one company" },
          { id: "b", label: "CIDR block", icon: "blocks", hue: "green", value: "/{cidrPrefix}", note: "{cidrSize} addresses, {cidrWastePct} spare" },
          { id: "c", label: "Old classes", icon: "blocks", hue: "amber", value: "/{classPrefix}", note: "{classSize} addresses, {classWastePct} spare" },
        ],
      },
    ],
    widgets: { split: [{ kind: "custom", name: "subnets" }] },
    subs: { hostB: "192.168.1.{hostB}", split: "{subnets} subnets of {subnetSize}" },
  },
};
