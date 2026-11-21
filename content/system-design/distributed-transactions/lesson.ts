import type { Lesson } from "@tintelix/schema";
import { txnCheatsheet } from "./cheatsheet";
import { txnModel } from "./model";
import { txnScene } from "./scene";
import { txnSteps } from "./steps";

export const distributedTransactions: Lesson = {
  id: "distributed-transactions",
  home: "system-design",
  slug: "distributed-transactions",
  topic: "Distributed transactions",
  title: "One order, three services",
  promise: "Keep an order consistent across three services: watch two-phase commit lock and block, and a saga undo what failed.",
  minutes: 7,
  level: 1,
  scene: txnScene,
  model: txnModel,
  controls: {},
  steps: txnSteps,
  components: ["users", "app-server", "database"],
  buildsOn: ["consistency-models"],
  questions: [],
  cheatsheet: txnCheatsheet,
};
