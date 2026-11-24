import type { SceneSpec } from "@tintelix/schema";

type Hop = [string, 1 | -1, string];
const path = (...hops: Hop[]) => hops.map(([wire, dir, at]) => ({ wire, dir, at }));

/**
 * Shoppers pay through the payment service, which talks to the card network (top) and records every
 * attempt in the payments database (bottom). The double-entry ledger and reconciliation appear on the right.
 */
export const paymentScene: SceneSpec = {
  kind: "board",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 28, w: 984, h: 418 },
  nodes: {
    shoppers: { x: 16, y: 190, w: 150, h: 84, kind: "users", label: "Shoppers", sub: "pay" },
    pay: { x: 210, y: 180, w: 200, h: 104, kind: "app", label: "Payment service", sub: "keys, retries" },
    network: { x: 470, y: 50, w: 240, h: 110, kind: "services", label: "Card network", sub: "authorize, capture" },
    db: { x: 470, y: 300, w: 240, h: 120, kind: "db", label: "Payments database", sub: "every attempt" },
    ledger: { x: 760, y: 34, w: 224, h: 240, kind: "curve", label: "Double-entry ledger", sub: "", hidden: true },
    recon: { x: 760, y: 320, w: 224, h: 100, kind: "services", label: "Reconciliation", sub: "nightly match", hidden: true },
  },
  wires: {
    s_p: { from: [166, 232], to: [210, 232] },
    p_n: { from: [410, 200], to: [520, 160] },
    p_d: { from: [410, 266], to: [520, 300] },
    r_d: { from: [760, 370], to: [710, 370] },
  },
  board: {
    legend: [["cyan", "a payment"], ["violet", "a reconciliation"], ["green", "done"], ["red", "charged twice"]],
    flows: {
      chargeFirst: {
        from: "shoppers",
        path: path(["s_p", 1, "pay"], ["p_n", 1, "network"], ["p_n", -1, "pay"], ["p_d", 1, "db"]),
        color: "cyan",
        back: "green",
      },
      retryDup: { from: "shoppers", path: path(["s_p", 1, "pay"], ["p_n", 1, "network"]), color: "cyan", back: "green", fail: { at: "network", share: "dupShownPct" } },
      intent: {
        from: "shoppers",
        path: path(["s_p", 1, "pay"], ["p_d", 1, "db"], ["p_d", -1, "pay"], ["p_n", 1, "network"]),
        color: "cyan",
        back: "green",
        float: { at: "db", text: "PENDING, key K", color: "green", chance: 0.08 },
      },
      retrySafe: {
        from: "shoppers",
        path: path(["s_p", 1, "pay"], ["p_d", 1, "db"]),
        color: "cyan",
        back: "green",
        float: { at: "db", text: "key K seen: no second charge", color: "green", chance: 0.25 },
      },
      recon: { from: "recon", path: path(["r_d", 1, "db"]), color: "violet", small: true },
    },
    modes: [
      {
        flows: [],
        tiles: [
          { id: "a", label: "Payments", icon: "activity", hue: "cyan", value: "{attemptsM} million/day", note: "{avgRate} a second" },
          { id: "b", label: "At peak", icon: "gauge", hue: "violet", value: "{peakRate}/s", note: "easy for one database" },
          { id: "c", label: "Double charges", icon: "target", hue: "amber", value: "zero", note: "the real requirement" },
        ],
      },
      {
        flows: [{ flow: "chargeFirst", weight: 1 }],
        rate: 4,
        tiles: [
          { id: "a", label: "Payments", icon: "activity", hue: "cyan", value: "{avgRate}/s", note: "on an average day" },
          { id: "b", label: "Order of work", icon: "list", hue: "violet", value: "charge, record", note: "record the result after" },
          { id: "c", label: "Timeouts", icon: "hourglass", hue: "amber", value: "rare", note: "{timeoutsPer10k} in 10,000" },
        ],
      },
      {
        flows: [{ flow: "chargeFirst", weight: 3 }, { flow: "retryDup", weight: 1 }],
        rate: 7,
        tiles: [
          { id: "a", label: "Charged twice", icon: "alert", hue: "amber", value: "{dupsPerDay}/day", note: "{timeoutsPer10k} in 10,000 attempts", mood: "bad" },
          { id: "b", label: "The gap", icon: "hourglass", hue: "violet", value: "no record", note: "charged, then crashed" },
          { id: "c", label: "The retry", icon: "replay", hue: "cyan", value: "correct", note: "same key, but no memory" },
        ],
      },
      {
        flows: [{ flow: "intent", weight: 3 }, { flow: "retrySafe", weight: 1 }],
        rate: 7,
        tiles: [
          { id: "a", label: "Charged twice", icon: "check", hue: "green", value: "{dupsNow}", note: "the row was there first", mood: "good" },
          { id: "b", label: "First write", icon: "db", hue: "cyan", value: "PENDING", note: "keyed by the client's key" },
          { id: "c", label: "After a crash", icon: "target", hue: "violet", value: "ask the network", note: "status of that reference" },
        ],
      },
      {
        flows: [{ flow: "intent", weight: 1 }],
        rate: 7,
        tiles: [
          { id: "a", label: "Captured", icon: "check", hue: "green", value: "{captureRate}/s", note: "{capturePeak} at peak" },
          { id: "b", label: "Ledger rows", icon: "list", hue: "cyan", value: "{ledgerRowsM} million/day", note: "two per movement" },
          { id: "c", label: "Refunds", icon: "replay", hue: "violet", value: "{refundRate}/s", note: "new rows, never edits" },
        ],
      },
      {
        flows: [{ flow: "intent", weight: 3 }, { flow: "recon", weight: 1 }],
        rate: 7,
        tiles: [
          { id: "a", label: "Reconciled", icon: "sheet", hue: "violet", value: "nightly", note: "against the network's file" },
          { id: "b", label: "Network down", icon: "alert", hue: "amber", value: "circuit open", note: "back off, then retry" },
          { id: "c", label: "Stuck PENDING", icon: "wrench", hue: "green", value: "resolved", note: "a sweeper asks for status", mood: "good" },
        ],
      },
    ],
    widgets: {
      db: [{ kind: "text", text: "Charged twice today: {dupsNow}", when: { output: "dupShownPct", above: 0 } }],
      ledger: [{ kind: "custom", name: "ledger" }],
    },
    states: [{ node: "network", cls: "tx-hot", when: { output: "dupShownPct", above: 0 } }],
  },
};
