import type { SceneSpec } from "@tintelix/schema";

type Hop = [string, 1 | -1, string];
const path = (...hops: Hop[]) => hops.map(([wire, dir, at]) => ({ wire, dir, at }));
const toServers: Hop = ["s_v", 1, "servers"];
const viaMap: Hop[] = [["v_reg", 1, "registry"], ["v_reg", -1, "servers"]];
const viaQueue: Hop[] = [["v_st", 1, "store"], ["v_st", -1, "servers"]];

/**
 * Asha sends on the left, Ravi receives on the right, the chat servers sit between them. The session
 * map sits above, the durable inbox queues and the phone's push service below, a group above Ravi, and
 * the presence list bottom left.
 */
export const chatScene: SceneSpec = {
  kind: "board",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 28, w: 984, h: 418 },
  nodes: {
    sender: { x: 16, y: 160, w: 170, h: 84, kind: "users", label: "Asha", sub: "sending" },
    servers: { x: 260, y: 154, w: 200, h: 96, kind: "app", label: "Chat servers", sub: "hold open sockets" },
    recipient: { x: 800, y: 160, w: 184, h: 84, kind: "users", label: "Ravi", sub: "receiving" },
    store: { x: 530, y: 300, w: 210, h: 96, kind: "db", label: "Message store", sub: "until delivered" },
    registry: { x: 530, y: 36, w: 210, h: 90, kind: "cache", label: "Session map", sub: "user → chat server", hidden: true },
    push: { x: 800, y: 300, w: 184, h: 96, kind: "edge", label: "Push service", sub: "wakes the phone", hidden: true },
    group: { x: 800, y: 36, w: 184, h: 90, kind: "users", label: "Group", sub: "9 other members", hidden: true },
    presence: { x: 16, y: 286, w: 380, h: 158, kind: "curve", label: "Presence", sub: "", hidden: true },
  },
  wires: {
    s_v: { from: [186, 202], to: [260, 202] },
    v_r: { from: [460, 202], to: [800, 202] },
    v_st: { from: [430, 250], to: [530, 348] },
    st_p: { from: [740, 348], to: [800, 348] },
    p_r: { from: [892, 300], to: [892, 244], straight: true },
    v_reg: { from: [430, 154], to: [530, 81] },
    v_g: { from: [460, 186], to: [800, 81] },
  },
  board: {
    legend: [["cyan", "message"], ["green", "delivered"], ["amber", "offline: wake + sync"], ["violet", "poll or heartbeat"]],
    flows: {
      send: { from: "sender", path: path(toServers, ["v_st", 1, "store"]), color: "cyan", back: "green" },
      poll: {
        from: "recipient",
        path: path(["v_r", -1, "servers"], ["v_st", 1, "store"]),
        color: "violet",
        back: "green",
        float: { at: "servers", text: "nothing new", color: "violet", chance: 0.12 },
      },
      live: { from: "sender", path: path(toServers, ...viaMap, ["v_r", 1, "recipient"]), color: "cyan", back: "green" },
      durable: { from: "sender", path: path(toServers, ...viaQueue, ...viaMap, ["v_r", 1, "recipient"]), color: "cyan", back: "green" },
      offline: {
        from: "sender",
        path: path(toServers, ["v_st", 1, "store"], ["st_p", 1, "push"], ["p_r", 1, "recipient"]),
        color: "amber",
        back: "green",
        float: { at: "push", text: "wake up, then sync", color: "amber", chance: 0.3 },
      },
      sync: { from: "recipient", path: path(["v_r", -1, "servers"], ["v_st", 1, "store"]), color: "amber", back: "green" },
      groupSend: {
        from: "sender",
        path: path(toServers, ...viaQueue, ["v_g", 1, "group"]),
        color: "cyan",
        back: "green",
        float: { at: "group", text: "9 deliveries, 9 receipts", color: "green", chance: 0.2 },
      },
      beatA: { from: "sender", path: path(toServers), color: "violet", small: true, back: "green" },
      beatR: { from: "recipient", path: path(["v_r", -1, "servers"]), color: "violet", small: true, back: "green" },
    },
    modes: [
      {
        flows: [],
        tiles: [
          { id: "a", label: "Messages sent", icon: "spark", hue: "cyan", value: "{sendsB} billion", note: "a day" },
          { id: "b", label: "Deliveries", icon: "activity", hue: "violet", value: "{deliveryRateM} million/s", note: "{deliveryPeakM} million/s at peak" },
          { id: "c", label: "Delivered within", icon: "timer", hue: "amber", value: "1 s", note: "at p99, in order, never lost" },
        ],
      },
      {
        flows: [{ flow: "send", weight: 1 }, { flow: "poll", weight: 6 }],
        rate: 7,
        tiles: [
          { id: "a", label: "Polls", icon: "activity", hue: "violet", value: "{pollRateM} million/s", note: "{onlineM} million phones asking" },
          { id: "b", label: "Empty polls", icon: "alert", hue: "amber", value: "{emptyPollPct}", note: "nothing new", mood: "bad" },
          { id: "c", label: "A message waits", icon: "timer", hue: "cyan", value: "up to {pollWaitSec}", note: "for the next poll", mood: "bad" },
        ],
      },
      {
        flows: [{ flow: "live", weight: 1 }],
        rate: 6,
        tiles: [
          { id: "a", label: "Open connections", icon: "users", hue: "cyan", value: "{onlineM} million", note: "one socket per phone" },
          { id: "b", label: "Chat servers", icon: "server", hue: "violet", value: "{chatServers}", note: "half a million sockets each" },
          { id: "c", label: "A message waits", icon: "bolt", hue: "green", value: "no time", note: "pushed down the open socket", mood: "good" },
        ],
      },
      {
        flows: [{ flow: "durable", weight: 5 }, { flow: "offline", weight: 2 }, { flow: "sync", weight: 1 }],
        rate: 6,
        tiles: [
          { id: "a", label: "Stored first", icon: "db", hue: "violet", value: "always", note: "before any push", mood: "good" },
          { id: "b", label: "Offline phones", icon: "edge", hue: "amber", value: "woken", note: "then sync from their last ID" },
          { id: "c", label: "Kept after delivery", icon: "check", hue: "green", value: "no", note: "{storageTbDay} TB a day if it were" },
        ],
      },
      {
        flows: [{ flow: "durable", weight: 4 }, { flow: "groupSend", weight: 3 }],
        rate: 7,
        tiles: [
          { id: "a", label: "Deliveries a day", icon: "activity", hue: "cyan", value: "{deliveriesB} billion", note: "from {sendsB} billion sends" },
          { id: "b", label: "From groups", icon: "users", hue: "violet", value: "{groupDeliveryPct}", note: "though only {groupPct} of sends" },
          { id: "c", label: "Receipts", icon: "check", hue: "green", value: "per member", note: "never one flag for the group" },
        ],
      },
      {
        flows: [{ flow: "durable", weight: 3 }, { flow: "beatA", weight: 2 }, { flow: "beatR", weight: 2 }],
        rate: 7,
        tiles: [
          { id: "a", label: "Heartbeats", icon: "activity", hue: "violet", value: "{heartbeatRateM} million/s", note: "one every 30 s per phone" },
          { id: "b", label: "Presence store", icon: "db", hue: "cyan", value: "eventual", note: "stale for a moment is fine" },
          { id: "c", label: "Messages", icon: "check", hue: "green", value: "exact", note: "never eventual", mood: "good" },
        ],
      },
    ],
    widgets: { presence: [{ kind: "custom", name: "presence" }] },
    subs: { servers: "{chatServers} servers" },
  },
};
