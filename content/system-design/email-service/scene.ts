import type { SceneSpec } from "@tintelix/schema";

type Hop = [string, 1 | -1, string];
const path = (...hops: Hop[]) => hops.map(([wire, dir, at]) => ({ wire, dir, at }));

/**
 * Mail from other servers arrives top left through the mail servers; people read, search and send from the
 * bottom left through the mail API. Mailboxes sit in the middle, attachments and the search index on the right.
 */
export const emailScene: SceneSpec = {
  kind: "board",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 28, w: 984, h: 418 },
  nodes: {
    senders: { x: 16, y: 40, w: 150, h: 84, kind: "users", label: "Senders", sub: "mail servers" },
    readers: { x: 16, y: 330, w: 150, h: 84, kind: "users", label: "Your apps", sub: "web, phone" },
    smtp: { x: 210, y: 40, w: 200, h: 90, kind: "app", label: "Mail servers", sub: "SMTP, spam checks" },
    api: { x: 210, y: 330, w: 200, h: 90, kind: "app", label: "Mail API", sub: "read, search, send" },
    store: { x: 470, y: 150, w: 240, h: 150, kind: "db", label: "Mailboxes", sub: "every message" },
    blobs: { x: 760, y: 40, w: 224, h: 100, kind: "origin", label: "Attachments", sub: "stored once, by hash", hidden: true },
    index: { x: 760, y: 320, w: 224, h: 100, kind: "services", label: "Search index", sub: "one per mailbox", hidden: true },
  },
  wires: {
    i_s: { from: [166, 82], to: [210, 82] },
    s_st: { from: [410, 110], to: [470, 190] },
    r_a: { from: [166, 372], to: [210, 372] },
    a_st: { from: [410, 360], to: [470, 262] },
    st_b: { from: [710, 180], to: [760, 90] },
    st_x: { from: [710, 270], to: [760, 350] },
    a_x: { from: [410, 395], to: [760, 395] },
    a_sm: { from: [310, 330], to: [310, 140] },
  },
  board: {
    legend: [["cyan", "a message"], ["violet", "mail going out"], ["green", "done"], ["red", "too slow"]],
    flows: {
      recv: { from: "senders", path: path(["i_s", 1, "smtp"], ["s_st", 1, "store"]), color: "cyan", back: "green", fail: { at: "store", share: "dbFailPct" } },
      read: { from: "readers", path: path(["r_a", 1, "api"], ["a_st", 1, "store"]), color: "cyan", back: "green", fail: { at: "store", share: "dbFailPct" } },
      recvAttach: { from: "senders", path: path(["i_s", 1, "smtp"], ["s_st", 1, "store"], ["st_b", 1, "blobs"]), color: "cyan", back: "green" },
      recvIndexed: { from: "senders", path: path(["i_s", 1, "smtp"], ["s_st", 1, "store"], ["st_x", 1, "index"]), color: "cyan", back: "green" },
      search: { from: "readers", path: path(["r_a", 1, "api"], ["a_x", 1, "index"]), color: "cyan", back: "green" },
      send: {
        from: "readers",
        path: path(["r_a", 1, "api"], ["a_sm", 1, "smtp"], ["i_s", -1, "senders"]),
        color: "violet",
        float: { at: "smtp", text: "signed: DKIM", color: "green", chance: 0.1 },
      },
    },
    modes: [
      {
        flows: [],
        tiles: [
          { id: "a", label: "Inboxes", icon: "users", hue: "cyan", value: "{usersB} billion", note: "{recvPerDay} in, {sentPerDay} out a day" },
          { id: "b", label: "Mail arriving", icon: "activity", hue: "violet", value: "{peakRecv}/s", note: "at peak" },
          { id: "c", label: "New mail a year", icon: "db", hue: "amber", value: "{totalPbYear} PB", note: "{attachPbYear} PB of it attachments" },
        ],
      },
      {
        flows: [{ flow: "recv", weight: 2 }, { flow: "read", weight: 1 }],
        rate: 4,
        tiles: [
          { id: "a", label: "Writes now", icon: "activity", hue: "cyan", value: "{dbWrites}/s", note: "launch" },
          { id: "b", label: "Database busy", icon: "db", hue: "violet", value: "{dbBusyPct}", note: "{dbCap} writes a second", mood: "good", moodIf: { output: "dbBusyPct", above: 100, mood: "bad" } },
          { id: "c", label: "One table", icon: "sheet", hue: "amber", value: "all mail", note: "attachments in the rows" },
        ],
      },
      {
        flows: [{ flow: "recv", weight: 2 }, { flow: "read", weight: 1 }],
        rate: 8,
        tiles: [
          { id: "a", label: "Writes now", icon: "activity", hue: "cyan", value: "{dbWrites}/s", note: "full size, peak" },
          { id: "b", label: "Database busy", icon: "db", hue: "violet", value: "{dbBusyPct}", note: "{dbFailPct} of writes fail", mood: "good", moodIf: { output: "dbBusyPct", above: 100, mood: "bad" } },
          { id: "c", label: "Storage", icon: "alert", hue: "amber", value: "{totalPbYear} PB/yr", note: "no machine holds that", mood: "bad" },
        ],
      },
      {
        flows: [{ flow: "recv", weight: 2 }, { flow: "recvAttach", weight: 1 }, { flow: "read", weight: 2 }],
        rate: 8,
        tiles: [
          { id: "a", label: "Mailbox shards", icon: "blocks", hue: "cyan", value: "{storageNodes}", note: "for one year of mail" },
          { id: "b", label: "Writes per shard", icon: "activity", hue: "green", value: "{writesPerShard}/s", note: "storage sets the count", mood: "good" },
          { id: "c", label: "Attachments", icon: "db", hue: "violet", value: "{attachPbYear} PB/yr", note: "each stored once" },
        ],
      },
      {
        flows: [{ flow: "recvIndexed", weight: 2 }, { flow: "read", weight: 1 }, { flow: "search", weight: 2 }],
        rate: 8,
        tiles: [
          { id: "a", label: "Searches", icon: "target", hue: "cyan", value: "{searchRate}/s", note: "{searchesPerDay} a person a day" },
          { id: "b", label: "Each search reads", icon: "list", hue: "green", value: "1 mailbox", note: "its own small index", mood: "good" },
          { id: "c", label: "Indexing", icon: "hourglass", hue: "violet", value: "after delivery", note: "never in the way" },
        ],
      },
      {
        flows: [{ flow: "recvIndexed", weight: 1 }, { flow: "read", weight: 1 }, { flow: "send", weight: 2 }],
        rate: 8,
        tiles: [
          { id: "a", label: "Mail sent", icon: "arrowRight", hue: "violet", value: "{sendRate}/s", note: "signed: SPF, DKIM, DMARC" },
          { id: "b", label: "Hard bounces", icon: "alert", hue: "amber", value: "{hardBounces}", note: "suppressed for good" },
          { id: "c", label: "Password resets", icon: "check", hue: "green", value: "own subdomain", note: "a campaign can't sink them", mood: "good" },
        ],
      },
    ],
    widgets: {
      store: [
        { kind: "meter", output: "dbBusyPct", max: 100, text: "{dbBusyPct} busy" },
        { kind: "text", text: "Too slow: {dbFailPct}", when: { output: "dbFailPct", above: 0 } },
        { kind: "text", text: "{storageNodes} shards by user ID", when: { output: "writesPerShard", above: 0 } },
      ],
    },
    states: [{ node: "store", cls: "tx-hot", when: { output: "dbBusyPct", above: 100 } }],
  },
};
