import type { SceneSpec } from "@tintelix/schema";

const path = (...hops: [string, 1 | -1, string][]) => hops.map(([wire, dir, at]) => ({ wire, dir, at }));
const intake: [string, 1 | -1, string][] = [["t_a", 1, "api"], ["a_r", 1, "router"]];
const dedup: [string, 1 | -1, string][] = [["r_d", 1, "dedup"], ["r_d", -1, "router"]];

/**
 * Events come in on the left, through the ingest API to the router; the router fans out to the
 * channels on the right (first through one shared queue, then a queue per channel) and their
 * providers. The dedup keys sit under the router and the broadcast's progress bottom left.
 */
export const notifyScene: SceneSpec = {
  kind: "board",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 28, w: 984, h: 418 },
  nodes: {
    trigger: { x: 16, y: 186, w: 170, h: 84, kind: "users", label: "Services", sub: "events to send" },
    api: { x: 220, y: 186, w: 170, h: 84, kind: "app", label: "Ingest API", sub: "202 accepted" },
    router: { x: 424, y: 186, w: 180, h: 84, kind: "app", label: "Router", sub: "who, and how" },
    queue: { x: 650, y: 180, w: 180, h: 96, kind: "services", label: "One queue", sub: "every channel" },
    pushQ: { x: 650, y: 36, w: 180, h: 84, kind: "services", label: "Push queue", sub: "own workers", hidden: true },
    emailQ: { x: 650, y: 176, w: 180, h: 84, kind: "services", label: "Email queue", sub: "own workers", hidden: true },
    smsQ: { x: 650, y: 316, w: 180, h: 84, kind: "services", label: "SMS queue", sub: "own workers", hidden: true },
    pushP: { x: 850, y: 36, w: 134, h: 84, kind: "edge", label: "Push", sub: "phones" },
    emailP: { x: 850, y: 176, w: 134, h: 84, kind: "edge", label: "Email", sub: "inboxes" },
    smsP: { x: 850, y: 316, w: 134, h: 104, kind: "edge", label: "SMS", sub: "gateway" },
    dedup: { x: 424, y: 326, w: 190, h: 100, kind: "db", label: "Sent-once keys", sub: "unique keys", hidden: true },
    lanes: { x: 16, y: 290, w: 390, h: 152, kind: "curve", label: "Broadcast to 15 million", sub: "", hidden: true },
  },
  wires: {
    t_a: { from: [186, 228], to: [220, 228] },
    a_r: { from: [390, 228], to: [424, 228] },
    r_q: { from: [604, 228], to: [650, 228] },
    r_pq: { from: [604, 212], to: [650, 78] },
    r_eq: { from: [604, 228], to: [650, 218] },
    r_sq: { from: [604, 244], to: [650, 358] },
    q_pp: { from: [830, 212], to: [850, 78] },
    q_ep: { from: [830, 228], to: [850, 218] },
    q_sp: { from: [830, 244], to: [850, 358] },
    pq_pp: { from: [830, 78], to: [850, 78] },
    eq_ep: { from: [830, 218], to: [850, 218] },
    sq_sp: { from: [830, 358], to: [850, 358] },
    r_d: { from: [514, 270], to: [514, 326], straight: true },
  },
  board: {
    legend: [["cyan", "notification"], ["green", "delivered"], ["red", "refused or duplicate"]],
    flows: {
      sharedPush: { from: "trigger", path: path(...intake, ["r_q", 1, "queue"], ["q_pp", 1, "pushP"]), color: "cyan", back: "green" },
      sharedEmail: { from: "trigger", path: path(...intake, ["r_q", 1, "queue"], ["q_ep", 1, "emailP"]), color: "cyan", back: "green" },
      sharedSms: {
        from: "trigger",
        path: path(...intake, ["r_q", 1, "queue"], ["q_sp", 1, "smsP"]),
        color: "cyan",
        back: "green",
        fail: { at: "smsP", share: "smsRejectPct" },
      },
      lanePush: { from: "trigger", path: path(...intake, ["r_pq", 1, "pushQ"], ["pq_pp", 1, "pushP"]), color: "cyan", back: "green" },
      laneEmail: { from: "trigger", path: path(...intake, ["r_eq", 1, "emailQ"], ["eq_ep", 1, "emailP"]), color: "cyan", back: "green" },
      laneSms: { from: "trigger", path: path(...intake, ["r_sq", 1, "smsQ"], ["sq_sp", 1, "smsP"]), color: "cyan", back: "green" },
      pushD: { from: "trigger", path: path(...intake, ...dedup, ["r_pq", 1, "pushQ"], ["pq_pp", 1, "pushP"]), color: "cyan", back: "green" },
      emailD: { from: "trigger", path: path(...intake, ...dedup, ["r_eq", 1, "emailQ"], ["eq_ep", 1, "emailP"]), color: "cyan", back: "green" },
      smsD: { from: "trigger", path: path(...intake, ...dedup, ["r_sq", 1, "smsQ"], ["sq_sp", 1, "smsP"]), color: "cyan", back: "green" },
      replay: {
        from: "trigger",
        path: path(...intake, ["r_d", 1, "dedup"]),
        color: "cyan",
        back: "green",
        fail: { at: "dedup", share: "dupDropPct" },
      },
    },
    modes: [
      {
        flows: [],
        tiles: [
          { id: "a", label: "Events", icon: "activity", hue: "cyan", value: "{triggerRate}/s", note: "{triggerPeak}/s at peak" },
          { id: "b", label: "Biggest broadcast", icon: "users", hue: "violet", value: "{audienceM} million", note: "users, one incident notice" },
          { id: "c", label: "Deadline", icon: "timer", hue: "amber", value: "5 min", note: "send attempted on every channel" },
        ],
      },
      {
        flows: [{ flow: "sharedPush", weight: 70 }, { flow: "sharedEmail", weight: 25 }, { flow: "sharedSms", weight: 10 }],
        rate: 4,
        tiles: [
          { id: "a", label: "Events", icon: "activity", hue: "cyan", value: "{triggerRate}/s", note: "mostly one recipient each" },
          { id: "b", label: "Queues", icon: "stack", hue: "violet", value: "1", note: "every channel shares it" },
          { id: "c", label: "Delivered", icon: "check", hue: "green", value: "on time", note: "an ordinary day", mood: "good" },
        ],
      },
      {
        flows: [{ flow: "sharedPush", weight: 70 }, { flow: "sharedEmail", weight: 25 }, { flow: "sharedSms", weight: 10 }],
        rate: 7,
        tiles: [
          { id: "a", label: "SMS gateway", icon: "gauge", hue: "amber", value: "{smsRate}/s", note: "needs {smsNeed}/s; refuses {smsRejectPct}", mood: "bad" },
          { id: "b", label: "Push all sent by", icon: "timer", hue: "violet", value: "{pushDoneSec}", note: "stuck behind SMS in one queue", mood: "bad" },
          { id: "c", label: "Push sent", icon: "activity", hue: "cyan", value: "{pushEff}/s", note: "needs {pushNeed}/s" },
        ],
      },
      {
        flows: [{ flow: "lanePush", weight: 70 }, { flow: "laneEmail", weight: 25 }, { flow: "laneSms", weight: 10 }],
        rate: 7,
        tiles: [
          { id: "a", label: "Push all sent by", icon: "timer", hue: "green", value: "{pushDoneSec}", note: "its own queue, its own pace", mood: "good" },
          { id: "b", label: "SMS all sent by", icon: "hourglass", hue: "amber", value: "{smsDrainSec}", note: "{smsAtTargetPct} by the deadline", mood: "good", moodIf: { output: "smsDrainSec", above: 300, mood: "bad" } },
          { id: "c", label: "SMS refused", icon: "check", hue: "violet", value: "{smsRejectPct}", note: "workers keep to the gateway's rate", mood: "good" },
        ],
      },
      {
        flows: [{ flow: "pushD", weight: 70 }, { flow: "emailD", weight: 25 }, { flow: "smsD", weight: 10 }, { flow: "replay", weight: 12 }],
        rate: 7,
        tiles: [
          { id: "a", label: "Duplicates sent", icon: "check", hue: "green", value: "none", note: "the losing insert drops its copy", mood: "good" },
          { id: "b", label: "Key store", icon: "db", hue: "violet", value: "{keyStoreGb} GB", note: "a row per user per channel, 48 h" },
          { id: "c", label: "Replays", icon: "replay", hue: "amber", value: "dropped", note: "before fan-out" },
        ],
      },
      {
        flows: [{ flow: "pushD", weight: 70 }, { flow: "emailD", weight: 25 }, { flow: "smsD", weight: 10 }],
        rate: 7,
        tiles: [
          { id: "a", label: "Users resolved", icon: "users", hue: "cyan", value: "{resolveRate}/s", note: "{partitions} partitions × 2,000/s" },
          { id: "b", label: "Whole audience", icon: "timer", hue: "violet", value: "{resolveSec}", note: "before the last send is queued", mood: "good", moodIf: { output: "resolveSec", above: 300, mood: "bad" } },
          { id: "c", label: "Deadline", icon: "hourglass", hue: "amber", value: "5 min", note: "for the whole broadcast" },
        ],
      },
    ],
    widgets: {
      lanes: [{ kind: "custom", name: "lanes" }],
      smsP: [{ kind: "text", text: "Refusing {smsRejectPct}", when: { output: "smsRejectPct", above: 0 } }],
    },
    states: [{ node: "smsP", cls: "tx-hot", when: { output: "smsRejectPct", above: 0 } }],
    subs: { smsP: "{smsRate}/s cap" },
  },
};
