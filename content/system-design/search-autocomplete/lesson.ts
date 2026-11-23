import type { Lesson } from "@tintelix/schema";
import { suggestCheatsheet } from "./cheatsheet";
import { suggestModel } from "./model";
import { suggestScene } from "./scene";
import { suggestSteps } from "./steps";

export const searchAutocomplete: Lesson = {
  id: "search-autocomplete",
  home: "system-design",
  slug: "search-autocomplete",
  topic: "Design search autocomplete",
  title: "Guess the query after two letters",
  promise: "Answer every keystroke in under 100 ms: see a sorted database query drown, then serve precomputed top fives from a trie built offline and cached in the browser.",
  minutes: 8,
  level: 2,
  scene: suggestScene,
  model: suggestModel,
  controls: {
    prefixLen: {
      label: "Letters typed",
      min: 1,
      max: 4,
      step: 1,
      unit: "letters",
      readout: "Matches **{matchRows}** rows: **{queryMs}** a query, and the database is **{dbBusyPct}** busy.",
    },
  },
  steps: suggestSteps,
  components: ["users", "app-server", "cache", "database"],
  buildsOn: ["caching", "sharding"],
  questions: [],
  cheatsheetInputs: { mode: 5 },
  cheatsheet: suggestCheatsheet,
};
