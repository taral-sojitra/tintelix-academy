import type { Lesson } from "@tintelix/schema";
import { exchangeCheatsheet } from "./cheatsheet";
import { exchangeModel } from "./model";
import { exchangeScene } from "./scene";
import { exchangeSteps } from "./steps";

export const stockExchange: Lesson = {
  id: "stock-exchange",
  home: "system-design",
  slug: "stock-exchange",
  topic: "Design a stock exchange",
  title: "Match a buy and a sell in microseconds",
  promise: "Match 137,000 orders a second fairly and lose none: number every order in one sequence and journal it, match in memory with one thread per stock, replay the journal for failover, and send market data to everyone at once.",
  minutes: 8,
  level: 2,
  scene: exchangeScene,
  model: exchangeModel,
  controls: {
    hotSharePct: {
      label: "Busiest stock's share of orders",
      min: 1,
      max: 60,
      step: 1,
      unit: "%",
      readout: "That stock's thread is **{hotBusyPct}** busy at the open.",
    },
    subscribers: {
      label: "Firms receiving market data",
      min: 100,
      max: 5000,
      step: 100,
      readout: "One by one: **{unicastM} million** messages a second. Multicast: {feedRate}.",
    },
  },
  steps: exchangeSteps,
  components: ["users", "app-server", "database"],
  buildsOn: ["message-queues", "unique-ids"],
  questions: [],
  cheatsheetInputs: { mode: 5 },
  cheatsheet: exchangeCheatsheet,
};
