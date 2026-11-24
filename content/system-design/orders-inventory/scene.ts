import type { SceneSpec } from "@tintelix/schema";

type Hop = [string, 1 | -1, string];
const path = (...hops: Hop[]) => hops.map(([wire, dir, at]) => ({ wire, dir, at }));

/**
 * Shoppers view items through the store pages (top) and buy through the order service (bottom); both
 * reach the inventory database in the middle. Payments and the saga's log appear on the right.
 */
export const ordersScene: SceneSpec = {
  kind: "board",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 28, w: 984, h: 418 },
  nodes: {
    shoppers: { x: 16, y: 190, w: 150, h: 84, kind: "users", label: "Shoppers", sub: "view, buy" },
    shop: { x: 210, y: 50, w: 190, h: 92, kind: "app", label: "Store pages", sub: "stock badges" },
    orders: { x: 210, y: 320, w: 190, h: 92, kind: "app", label: "Order service", sub: "checkout" },
    inventory: { x: 470, y: 160, w: 250, h: 150, kind: "db", label: "Inventory", sub: "stock by place" },
    payments: { x: 780, y: 330, w: 204, h: 92, kind: "services", label: "Payments", sub: "authorize, void", hidden: true },
    saga: { x: 760, y: 34, w: 224, h: 224, kind: "curve", label: "Order saga", sub: "", hidden: true },
  },
  wires: {
    s_p: { from: [166, 210], to: [210, 110] },
    s_o: { from: [166, 254], to: [210, 360] },
    p_i: { from: [400, 110], to: [520, 160] },
    o_i: { from: [400, 352], to: [520, 310] },
    o_pay: { from: [400, 384], to: [780, 384] },
  },
  board: {
    legend: [["cyan", "a view or a checkout"], ["green", "done"], ["red", "oversold or timed out"]],
    flows: {
      view: { from: "shoppers", path: path(["s_p", 1, "shop"], ["p_i", 1, "inventory"]), color: "cyan", small: true, back: "green" },
      buy: { from: "shoppers", path: path(["s_o", 1, "orders"], ["o_i", 1, "inventory"]), color: "cyan", back: "green", fail: { at: "inventory", share: "failPct" } },
      order: {
        from: "shoppers",
        path: path(["s_o", 1, "orders"], ["o_i", 1, "inventory"], ["o_i", -1, "orders"], ["o_pay", 1, "payments"]),
        color: "cyan",
        back: "green",
        float: { at: "payments", text: "declined → release stock", color: "amber", chance: 0.05 },
      },
    },
    modes: [
      {
        flows: [],
        tiles: [
          { id: "a", label: "Stock rows", icon: "blocks", hue: "cyan", value: "{rowsM} million", note: "{warehouses} warehouses, {storageGb} GB" },
          { id: "b", label: "A normal day", icon: "activity", hue: "violet", value: "{readAvg} reads/s", note: "{writeAvg} writes a second" },
          { id: "c", label: "A flash sale", icon: "bolt", hue: "amber", value: "{flashWrites}/s", note: "checkouts on one item" },
        ],
      },
      {
        flows: [{ flow: "view", weight: 3 }, { flow: "buy", weight: 1 }],
        rate: 4,
        tiles: [
          { id: "a", label: "Checkout", icon: "list", hue: "cyan", value: "check, pay, take", note: "subtract at the end" },
          { id: "b", label: "Stock writes", icon: "activity", hue: "violet", value: "{writeAvg}/s", note: "a normal day" },
          { id: "c", label: "Oversold", icon: "check", hue: "green", value: "never seen", note: "on a normal day" },
        ],
      },
      {
        flows: [{ flow: "view", weight: 3 }, { flow: "buy", weight: 3 }],
        rate: 8,
        tiles: [
          { id: "a", label: "Checkouts", icon: "bolt", hue: "cyan", value: "{flashWrites}/s", note: "{stock} units in stock" },
          { id: "b", label: "Oversold", icon: "alert", hue: "amber", value: "{oversold} units", note: "paid for, not there", mood: "bad" },
          { id: "c", label: "Checks pass for", icon: "hourglass", hue: "violet", value: "{payGapSec}", note: "while the card is charged" },
        ],
      },
      {
        flows: [{ flow: "view", weight: 3 }, { flow: "buy", weight: 3 }],
        rate: 8,
        tiles: [
          { id: "a", label: "Oversold", icon: "check", hue: "green", value: "{oversold}", note: "check and subtract at once", mood: "good" },
          { id: "b", label: "Told sold out", icon: "replay", hue: "cyan", value: "{soldOut}", note: "a 409, straight away" },
          { id: "c", label: "That one row", icon: "alert", hue: "amber", value: "{hotBusyPct}", note: "every checkout locks it", mood: "good", moodIf: { output: "hotBusyPct", above: 100, mood: "bad" } },
        ],
      },
      {
        flows: [{ flow: "view", weight: 3 }, { flow: "buy", weight: 3 }],
        rate: 8,
        tiles: [
          { id: "a", label: "Sub-counters", icon: "blocks", hue: "cyan", value: "{counters}", note: "adding up to the stock" },
          { id: "b", label: "Each one busy", icon: "db", hue: "green", value: "{hotBusyPct}", note: "{rowCap} updates a second each", mood: "good", moodIf: { output: "hotBusyPct", above: 100, mood: "bad" } },
          { id: "c", label: "In front", icon: "list", hue: "violet", value: "a queue", note: "a rush becomes a line" },
        ],
      },
      {
        flows: [{ flow: "view", weight: 2 }, { flow: "order", weight: 3 }],
        rate: 8,
        tiles: [
          { id: "a", label: "Orders", icon: "check", hue: "cyan", value: "{ordersPerDay}/day", note: "reserve, authorize, confirm" },
          { id: "b", label: "Declined", icon: "replay", hue: "amber", value: "{declinesPerDay}/day", note: "reservation released" },
          { id: "c", label: "Undo steps", icon: "wrench", hue: "green", value: "recorded", note: "and retried until done", mood: "good" },
        ],
      },
    ],
    widgets: {
      inventory: [
        { kind: "meter", output: "hotBusyPct", max: 100, text: "hot row {hotBusyPct} busy" },
        { kind: "text", text: "Oversold: {oversold} units", when: { output: "oversold", above: 0 } },
      ],
      saga: [
        {
          kind: "log",
          lines: [
            { text: "#8812 reserve 1 lamp · ok" },
            { text: "#8812 authorize · ok" },
            { text: "#8812 placed" },
            { text: "#8813 authorize · declined" },
            { text: "#8813 release the lamp" },
          ],
        },
      ],
    },
    states: [{ node: "inventory", cls: "tx-hot", when: { output: "failPct", above: 0 } }],
  },
};
