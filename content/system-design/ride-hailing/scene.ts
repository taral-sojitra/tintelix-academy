import type { SceneSpec } from "@tintelix/schema";

type Hop = [string, 1 | -1, string];
const path = (...hops: Hop[]) => hops.map(([wire, dir, at]) => ({ wire, dir, at }));

/**
 * Drivers' pings along the top (location service, then the in-memory driver index), riders' requests
 * along the bottom (matching, then the trips database), and the dispatch matcher on the right.
 */
export const rideScene: SceneSpec = {
  kind: "board",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 28, w: 984, h: 418 },
  nodes: {
    drivers: { x: 16, y: 50, w: 170, h: 84, kind: "users", label: "Drivers", sub: "5 million" },
    riders: { x: 16, y: 300, w: 170, h: 84, kind: "users", label: "Riders", sub: "want a car" },
    ingest: { x: 240, y: 50, w: 200, h: 84, kind: "app", label: "Location service", sub: "204, no body" },
    match: { x: 240, y: 300, w: 200, h: 84, kind: "app", label: "Matching", sub: "claim, then offer" },
    geo: { x: 510, y: 40, w: 210, h: 104, kind: "cache", label: "Driver index", sub: "cell → free drivers", hidden: true },
    db: { x: 510, y: 290, w: 210, h: 124, kind: "db", label: "Trips", sub: "each trip's steps" },
    dispatch: { x: 744, y: 40, w: 240, h: 180, kind: "curve", label: "Dispatch", sub: "", hidden: true },
  },
  wires: {
    d_i: { from: [186, 92], to: [240, 92] },
    i_db: { from: [440, 112], to: [510, 340] },
    i_g: { from: [440, 92], to: [510, 92] },
    r_m: { from: [186, 342], to: [240, 342] },
    m_g: { from: [440, 320], to: [510, 120] },
    m_db: { from: [440, 350], to: [510, 352] },
  },
  board: {
    legend: [["cyan", "ping or request"], ["green", "done"], ["red", "too slow or claimed"]],
    flows: {
      pingDb: { from: "drivers", path: path(["d_i", 1, "ingest"], ["i_db", 1, "db"]), color: "cyan", small: true, back: "green", fail: { at: "db", share: "dbFailPct" } },
      tripReq: { from: "riders", path: path(["r_m", 1, "match"], ["m_db", 1, "db"]), color: "cyan", back: "green", fail: { at: "db", share: "dbFailPct" } },
      ping: { from: "drivers", path: path(["d_i", 1, "ingest"], ["i_g", 1, "geo"]), color: "cyan", small: true },
      request: {
        from: "riders",
        path: path(["r_m", 1, "match"], ["m_g", 1, "geo"], ["m_g", -1, "match"], ["m_db", 1, "db"]),
        color: "cyan",
        back: "green",
        float: { at: "db", text: "claimed: driver 37", color: "green", chance: 0.12 },
      },
      clash: {
        from: "riders",
        path: path(["r_m", 1, "match"], ["m_g", 1, "geo"], ["m_g", -1, "match"], ["m_db", 1, "db"]),
        color: "cyan",
        back: "green",
        fail: { at: "db", share: "clashPct" },
      },
    },
    modes: [
      {
        flows: [],
        tiles: [
          { id: "a", label: "Driver pings", icon: "activity", hue: "cyan", value: "{pingRate}/s", note: "{driversM} million drivers, every {pingEvery} s" },
          { id: "b", label: "Trip writes", icon: "spark", hue: "violet", value: "{tripWriteRate}/s", note: "{tripsM} million trips, 6 steps each" },
          { id: "c", label: "Pings per trip write", icon: "gauge", hue: "amber", value: "{pingRatio}", note: "the load is telemetry" },
        ],
      },
      {
        flows: [{ flow: "pingDb", weight: 8 }, { flow: "tripReq", weight: 1 }],
        rate: 4,
        tiles: [
          { id: "a", label: "Writes now", icon: "activity", hue: "cyan", value: "{dbWrites}/s", note: "pings and trips, one database" },
          { id: "b", label: "Database busy", icon: "db", hue: "violet", value: "{dbBusyPct}", note: "50,000 writes a second", mood: "good", moodIf: { output: "dbBusyPct", above: 100, mood: "bad" } },
          { id: "c", label: "Kept forever", icon: "hourglass", hue: "amber", value: "every ping", note: "{pingMbps} MB/s at full size" },
        ],
      },
      {
        flows: [{ flow: "pingDb", weight: 8 }, { flow: "tripReq", weight: 1 }],
        rate: 7,
        tiles: [
          { id: "a", label: "Writes now", icon: "activity", hue: "cyan", value: "{dbWrites}/s", note: "almost all pings" },
          { id: "b", label: "Database busy", icon: "db", hue: "violet", value: "{dbBusyPct}", note: "{dbFailPct} of writes fail", mood: "good", moodIf: { output: "dbBusyPct", above: 100, mood: "bad" } },
          { id: "c", label: "Trips blocked", icon: "alert", hue: "amber", value: "behind pings", note: "same database, same queue", mood: "bad" },
        ],
      },
      {
        flows: [{ flow: "ping", weight: 8 }, { flow: "request", weight: 2 }],
        rate: 7,
        tiles: [
          { id: "a", label: "Pings stored", icon: "bolt", hue: "green", value: "latest only", note: "in memory, by cell", mood: "good" },
          { id: "b", label: "Candidates", icon: "users", hue: "cyan", value: "{candidates}", note: "free drivers in {cellsChecked} cells" },
          { id: "c", label: "Trips database", icon: "db", hue: "violet", value: "{dbBusyPct}", note: "trip writes only", mood: "good" },
        ],
      },
      {
        flows: [{ flow: "ping", weight: 6 }, { flow: "request", weight: 3 }, { flow: "clash", weight: 1 }],
        rate: 7,
        tiles: [
          { id: "a", label: "Matches in flight", icon: "activity", hue: "cyan", value: "{inFlight}", note: "{matchRate}/s × {matchTime} s each" },
          { id: "b", label: "Claim", icon: "check", hue: "green", value: "atomic", note: "free → claimed, or fail", mood: "good" },
          { id: "c", label: "Same driver twice", icon: "alert", hue: "amber", value: "never", note: "the second claim loses", mood: "good" },
        ],
      },
      {
        flows: [{ flow: "ping", weight: 8 }, { flow: "request", weight: 3 }],
        rate: 8,
        tiles: [
          { id: "a", label: "Stadium cell", icon: "target", hue: "amber", value: "split", note: "finer cells while it's hot" },
          { id: "b", label: "Driver goes silent", icon: "edge", hue: "violet", value: "trip kept", note: "unreachable isn't finished" },
          { id: "c", label: "Regions", icon: "server", hue: "cyan", value: "independent", note: "rides are local" },
        ],
      },
    ],
    widgets: {
      db: [
        { kind: "meter", output: "dbBusyPct", max: 100, text: "{dbBusyPct} busy" },
        { kind: "text", text: "Too slow: {dbFailPct}", when: { output: "dbFailPct", above: 0 } },
      ],
      dispatch: [{ kind: "custom", name: "dispatch" }],
    },
    states: [{ node: "db", cls: "tx-hot", when: { output: "dbBusyPct", above: 100 } }],
  },
};
