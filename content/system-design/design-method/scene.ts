import type { SceneSpec } from "@tintelix/schema";

/**
 * The design grows left to right above a 45-minute clock: viewers, vote servers, then the database, and
 * the queue above once the deep dive adds it. The clock along the bottom marks which of the seven steps
 * each part of the lesson covers.
 */
export const methodScene: SceneSpec = {
  kind: "board",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 28, w: 984, h: 418 },
  nodes: {
    users: { x: 24, y: 150, w: 182, h: 84, kind: "users", label: "Viewers", sub: "voting for an act" },
    app: { x: 290, y: 150, w: 180, h: 84, kind: "app", label: "Vote servers", sub: "take each vote" },
    queue: { x: 530, y: 30, w: 220, h: 108, kind: "services", label: "Queue", sub: "votes kept on disk", hidden: true },
    db: { x: 750, y: 160, w: 230, h: 146, kind: "db", label: "Database", sub: "votes and totals", hidden: true },
    api: { x: 500, y: 30, w: 484, h: 280, kind: "curve", label: "API and data", sub: "", hidden: true },
    clock: { x: 16, y: 318, w: 968, h: 124, kind: "curve", label: "45-minute clock", sub: "" },
  },
  wires: {
    u_a: { from: [206, 192], to: [290, 192] },
    a_q: { from: [470, 176], to: [530, 84] },
    a_d: { from: [470, 208], to: [750, 226] },
    q_d: { from: [750, 84], to: [865, 160] },
  },
  board: {
    legend: [["cyan", "vote"], ["violet", "batch write"], ["green", "accepted"], ["red", "failed"]],
    flows: {
      voteDirect: { path: [{ wire: "u_a", dir: 1, at: "app" }, { wire: "a_d", dir: 1, at: "db" }], color: "cyan", back: "green", fail: { at: "db", share: "dbFailPct" } },
      voteQueued: {
        path: [{ wire: "u_a", dir: 1, at: "app" }, { wire: "a_q", dir: 1, at: "queue" }],
        color: "cyan",
        back: "green",
        float: { at: "queue", text: "202 Accepted", color: "green", chance: 0.06 },
      },
      batch: { from: "queue", path: [{ wire: "q_d", dir: 1, at: "db" }], color: "violet", small: true, back: "green", fail: { at: "db", share: "dbFailPct" } },
    },
    modes: [
      {
        flows: [],
        tiles: [
          { id: "a", label: "Votes", icon: "users", hue: "cyan", value: "{votesM} million", note: "half of {viewersM} million viewers" },
          { id: "b", label: "At peak", icon: "activity", hue: "amber", value: "{peakVoteRate}/s", note: "twice the {avgVoteRate}/s average" },
          { id: "c", label: "Storage", icon: "db", hue: "violet", value: "{storageGb} GB", note: "small: the rate is the problem" },
        ],
      },
      {
        flows: [{ flow: "voteDirect", weight: 1 }],
        rate: 6,
        tiles: [
          { id: "a", label: "Votes at peak", icon: "activity", hue: "cyan", value: "{peakVoteRate}/s", note: "each one a database write" },
          { id: "b", label: "Database busy", icon: "db", hue: "violet", value: "{dbBusyPct}", note: "it takes about 5,000 writes a second", mood: "good", moodIf: { output: "dbBusyPct", above: 100, mood: "bad" } },
          { id: "c", label: "Votes lost", icon: "alert", hue: "amber", value: "{votesLostPct}", note: "", mood: "good", moodIf: { output: "votesLostPct", above: 0, mood: "bad" } },
        ],
      },
      {
        flows: [{ flow: "voteQueued", weight: 5 }, { flow: "batch", weight: 1 }],
        rate: 6,
        tiles: [
          { id: "a", label: "Queue takes", icon: "stack", hue: "cyan", value: "{peakVoteRate}/s", note: "every vote, straight away" },
          { id: "b", label: "Database busy", icon: "db", hue: "violet", value: "{dbBusyPct}", note: "{dbWriteRate} batch writes a second", mood: "good", moodIf: { output: "dbBusyPct", above: 100, mood: "bad" } },
          { id: "c", label: "Votes lost", icon: "check", hue: "green", value: "{votesLostPct}", note: "late writes wait in the queue", mood: "good" },
        ],
      },
      {
        flows: [{ flow: "voteQueued", weight: 5 }, { flow: "batch", weight: 1 }],
        rate: 6,
        tiles: [
          { id: "a", label: "Database", icon: "alert", hue: "amber", value: "down", note: "a standby takes over in seconds", mood: "bad" },
          { id: "b", label: "Waiting in the queue", icon: "stack", hue: "violet", value: "{queueBacklog}", note: "safe on disk, written later" },
          { id: "c", label: "Votes lost", icon: "check", hue: "green", value: "{votesLostPct}", note: "", mood: "good" },
        ],
      },
    ],
    widgets: {
      db: [
        { kind: "meter", output: "dbBusyPct", max: 100, text: "{dbBusyPct} busy · {dbWriteRate} writes/s" },
        { kind: "text", text: "Too busy: {overloadPct} of writes fail", when: { output: "overloadPct", above: 0 } },
        { kind: "text", text: "Down: writes wait in the queue", when: { output: "dbDown", above: 0.5 } },
      ],
      queue: [{ kind: "meter", output: "queueBacklog", max: 4e6, text: "{queueBacklog} votes waiting" }],
      api: [
        {
          kind: "log",
          lines: [
            { text: "POST /votes · show, act, voter token → 202 Accepted" },
            { text: "GET /shows/live/results → a total per act" },
            { text: "votes: voter · act · time (one row per voter)" },
            { text: "{votesM} million rows, {storageGb} GB a show" },
          ],
        },
      ],
      clock: [{ kind: "custom", name: "stepclock" }],
    },
    states: [
      { node: "db", cls: "tx-hot", when: { output: "dbBusyPct", above: 100 } },
      { node: "db", cls: "tx-down", when: { output: "dbDown", above: 0.5 } },
    ],
    subs: { users: "{peakVoteRate}/s at peak" },
  },
};
