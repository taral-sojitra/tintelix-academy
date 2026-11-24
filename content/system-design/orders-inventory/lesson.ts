import type { Lesson } from "@tintelix/schema";
import { ordersCheatsheet } from "./cheatsheet";
import { ordersModel } from "./model";
import { ordersScene } from "./scene";
import { ordersSteps } from "./steps";

export const ordersInventory: Lesson = {
  id: "orders-inventory",
  home: "system-design",
  slug: "orders-inventory",
  topic: "Design orders and inventory",
  title: "Sell only what's on the shelf",
  promise: "Take orders through a flash sale without selling a unit twice: check and subtract stock in one statement, split the hot item's counter, and run each order as a saga that can undo every step.",
  minutes: 8,
  level: 2,
  scene: ordersScene,
  model: ordersModel,
  controls: {
    subCounters: {
      label: "Sub-counters for the hot item",
      min: 1,
      max: 20,
      step: 1,
      readout: "Each sub-counter is **{hotBusyPct}** busy at {flashWrites} checkouts a second.",
    },
  },
  steps: ordersSteps,
  components: ["users", "app-server", "database"],
  buildsOn: ["distributed-transactions", "message-queues", "idempotency"],
  questions: [],
  cheatsheetInputs: { mode: 5 },
  cheatsheet: ordersCheatsheet,
};
