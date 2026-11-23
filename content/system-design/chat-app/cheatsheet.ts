import type { Lesson } from "@tintelix/schema";

export const chatCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "The numbers",
    text: ["{sendsB} billion sends a day; with groups of 10 it's {deliveriesB} billion deliveries ({deliveryRateM} million a second, about {deliveryPeakM} million at peak). Polling {onlineM} million phones every few seconds is mostly empty; open sockets need about {chatServers} chat servers."],
  },
  {
    heading: "Delivery",
    text: ["Write to the recipient's durable queue, then push down their socket if it's open (find it in the session map). Offline: the push service wakes the phone, which syncs from its last message ID. Order by server-assigned IDs. Drop messages once delivered."],
  },
  {
    heading: "Groups and presence",
    text: ["A group message is one delivery and one receipt per member ({groupDeliveryPct} of deliveries). Presence comes from heartbeats ({heartbeatRateM} million a second) into an eventually consistent store, shown only to people looking."],
  },
];
