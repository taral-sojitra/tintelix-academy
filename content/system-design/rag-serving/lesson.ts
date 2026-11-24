import type { Lesson } from "@tintelix/schema";
import { ragCheatsheet } from "./cheatsheet";
import { ragModel } from "./model";
import { ragScene } from "./scene";
import { ragSteps } from "./steps";

export const ragServing: Lesson = {
  id: "rag-serving",
  home: "system-design",
  slug: "rag-serving",
  topic: "Design a RAG and model-serving system",
  title: "Answer from your own documents",
  promise: "Answer questions from two million private documents with a language model: find the right passages in milliseconds, batch the slow generation onto a few GPUs, and keep the index as fresh as the documents.",
  minutes: 8,
  level: 2,
  scene: ragScene,
  model: ragModel,
  controls: {
    perGpu: {
      label: "Answers batched on one GPU",
      min: 1,
      max: 40,
      step: 1,
      readout: "**{gpusNeeded}** GPUs, each **{gpuBusyPct}** busy.",
    },
    changedDocs: {
      label: "Documents changed at once",
      min: 10000,
      max: 1000000,
      step: 10000,
      readout: "Answers stay stale for **{staleSec}** at {embedRate} re-embeddings a second.",
    },
  },
  steps: ragSteps,
  components: ["users", "app-server", "cache", "database"],
  buildsOn: ["caching", "message-queues", "api-gateway"],
  questions: [],
  cheatsheetInputs: { mode: 5 },
  cheatsheet: ragCheatsheet,
};
