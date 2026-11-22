import type { SceneSpec } from "@tintelix/schema";

/**
 * Callers on the left, app servers in the middle. The shared counter sits to the right until the lesson
 * drops it; then the 64-bit ID picture appears above and the coordinator that hands out machine numbers
 * below.
 */
export const idsScene: SceneSpec = {
  kind: "board",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 28, w: 984, h: 418 },
  nodes: {
    users: { x: 24, y: 196, w: 182, h: 84, kind: "users", label: "Users", sub: "creating things" },
    app: { x: 290, y: 196, w: 200, h: 84, kind: "app", label: "App servers", sub: "need IDs" },
    counter: { x: 640, y: 196, w: 240, h: 124, kind: "db", label: "Counter database", sub: "one shared counter" },
    layout: { x: 520, y: 30, w: 464, h: 186, kind: "curve", label: "A 64-bit ID", sub: "", hidden: true },
    coord: { x: 640, y: 300, w: 250, h: 96, kind: "services", label: "Coordinator", sub: "hands out machine numbers", hidden: true },
  },
  wires: {
    u_a: { from: [206, 238], to: [290, 238] },
    a_c: { from: [490, 246], to: [640, 258] },
    a_k: { from: [490, 266], to: [640, 348] },
  },
  board: {
    legend: [["cyan", "request"], ["green", "got an ID"], ["red", "failed"], ["amber", "waiting for the clock"], ["violet", "lease check"]],
    flows: {
      askCounter: { path: [{ wire: "u_a", dir: 1, at: "app" }, { wire: "a_c", dir: 1, at: "counter" }], color: "cyan", back: "green", fail: { at: "counter", share: "counterFailPct" } },
      localUuid: { path: [{ wire: "u_a", dir: 1, at: "app" }], color: "cyan", back: "green", float: { at: "app", text: "random UUID", color: "green", chance: 0.08 } },
      localId: { path: [{ wire: "u_a", dir: 1, at: "app" }], color: "cyan", back: "green", float: { at: "app", text: "time · machine · seq", color: "green", chance: 0.06 } },
      held: { path: [{ wire: "u_a", dir: 1, at: "app" }], color: "amber", back: "green", float: { at: "app", text: "clock behind: wait", color: "amber", chance: 0.3 } },
      lease: { from: "app", path: [{ wire: "a_k", dir: 1, at: "coord" }], color: "violet", small: true, back: "green", float: { at: "coord", text: "machine 37 still yours", color: "violet", chance: 0.2 } },
    },
    modes: [
      {
        flows: [{ flow: "askCounter", weight: 1 }],
        rate: 2,
        tiles: [
          { id: "a", label: "IDs needed", icon: "activity", hue: "cyan", value: "{fullIdRate}/s", note: "{servers} servers at peak" },
          { id: "b", label: "Counter busy", icon: "db", hue: "violet", value: "{counterBusyPct}", note: "{idRate} IDs a second at launch", mood: "good", moodIf: { output: "counterBusyPct", above: 100, mood: "bad" } },
          { id: "c", label: "ID size", icon: "blocks", hue: "amber", value: "{idBits} bits", note: "fits a BIGINT column" },
        ],
      },
      {
        flows: [{ flow: "askCounter", weight: 1 }],
        rate: 6,
        tiles: [
          { id: "a", label: "IDs asked for", icon: "activity", hue: "cyan", value: "{idRate}/s", note: "every one from the counter" },
          { id: "b", label: "Counter busy", icon: "db", hue: "violet", value: "{counterBusyPct}", note: "it answers about 5,000 a second", mood: "good", moodIf: { output: "counterBusyPct", above: 100, mood: "bad" } },
          { id: "c", label: "Requests failing", icon: "alert", hue: "amber", value: "{counterFailPct}", note: "and it's one machine", mood: "good", moodIf: { output: "counterFailPct", above: 0, mood: "bad" } },
        ],
      },
      {
        flows: [{ flow: "localUuid", weight: 1 }],
        rate: 6,
        tiles: [
          { id: "a", label: "ID size", icon: "blocks", hue: "amber", value: "{idBits} bits", note: "twice a BIGINT, in every index", mood: "bad" },
          { id: "b", label: "Sorted by time", icon: "clock", hue: "violet", value: "no", note: "new rows land all over the index", mood: "bad" },
          { id: "c", label: "Waits on others", icon: "check", hue: "green", value: "never", note: "each server makes its own", mood: "good" },
        ],
      },
      {
        flows: [{ flow: "localId", weight: 1 }],
        rate: 6,
        tiles: [
          { id: "a", label: "Machine numbers", icon: "server", hue: "amber", value: "{machines}", note: "for {servers} servers", mood: "good", moodIf: { output: "fitsMachines", below: 0.5, mood: "bad" } },
          { id: "b", label: "Per machine", icon: "activity", hue: "green", value: "{perMachineRate}/s", note: "{headroomX}× what one needs" },
          { id: "c", label: "Time runs out in", icon: "hourglass", hue: "violet", value: "{timeYears} years", note: "41 bits of milliseconds" },
        ],
      },
      {
        flows: [{ flow: "localId", weight: 1 }, { flow: "held", weight: 0.25 }, { flow: "lease", weight: 0.15 }],
        rate: 6,
        tiles: [
          { id: "a", label: "Clock jumped back", icon: "clock", hue: "amber", value: "{clockBackMs}", note: "an NTP correction", mood: "bad" },
          { id: "b", label: "IDs held back", icon: "hourglass", hue: "violet", value: "{heldIds}", note: "per server, until time catches up" },
          { id: "c", label: "Duplicate IDs", icon: "check", hue: "green", value: "none", note: "", mood: "good" },
        ],
      },
    ],
    widgets: {
      counter: [
        { kind: "meter", output: "counterBusyPct", max: 100, text: "{counterBusyPct} busy · {idRate} asks/s" },
        { kind: "text", text: "Too busy: {counterFailPct} fail", when: { output: "counterFailPct", above: 0 } },
      ],
      layout: [{ kind: "custom", name: "bitlayout" }],
    },
    states: [{ node: "counter", cls: "tx-hot", when: { output: "counterBusyPct", above: 100 } }],
    subs: { app: "{activeServers} running" },
  },
};
