import type { Lesson } from "@tintelix/schema";
import { walletCheatsheet } from "./cheatsheet";
import { walletModel } from "./model";
import { walletScene } from "./scene";
import { walletSteps } from "./steps";

export const digitalWallet: Lesson = {
  id: "digital-wallet",
  home: "system-design",
  slug: "digital-wallet",
  topic: "Design a digital wallet",
  title: "Move money between wallets safely",
  promise: "Move 50,000 transfers a second between 300 million wallets without creating or losing a rupee: shard wallets, run cross-shard transfers as sagas, and keep every step in an event log that can rebuild any balance.",
  minutes: 8,
  level: 2,
  scene: walletScene,
  model: walletModel,
  controls: {
    shards: {
      label: "Shards",
      min: 1,
      max: 64,
      step: 1,
      readout: "Each shard **{shardBusyPct}** busy; **{crossShardPct}** of transfers cross shards.",
    },
  },
  steps: walletSteps,
  components: ["users", "app-server", "database"],
  buildsOn: ["sharding", "distributed-transactions", "payment-system"],
  questions: [],
  cheatsheetInputs: { mode: 5 },
  cheatsheet: walletCheatsheet,
};
