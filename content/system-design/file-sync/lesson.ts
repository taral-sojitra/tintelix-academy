import type { Lesson } from "@tintelix/schema";
import { syncCheatsheet } from "./cheatsheet";
import { syncModel } from "./model";
import { syncScene } from "./scene";
import { syncSteps } from "./steps";

export const fileSync: Lesson = {
  id: "file-sync",
  home: "system-design",
  slug: "file-sync",
  topic: "Design cloud storage and file sync (Drive, Dropbox)",
  title: "Edit on a laptop, see it on a phone",
  promise: "Keep one folder the same on 120 million devices: cut files into chunks where the content says, upload only the chunks that changed, follow a change feed, and keep both edits when two devices clash.",
  minutes: 8,
  level: 2,
  scene: syncScene,
  model: syncModel,
  controls: {
    fileMb: {
      label: "Size of the edited file",
      min: 1,
      max: 2048,
      step: 1,
      unit: "MB",
      readout: "**{fileChunks}** chunks; an edit sends **{blockMovedMb} MB** of it, **{movedSharePct}**.",
    },
  },
  steps: syncSteps,
  components: ["users", "app-server", "database"],
  buildsOn: ["object-storage", "consistency-models"],
  questions: [],
  cheatsheetInputs: { mode: 4 },
  cheatsheet: syncCheatsheet,
};
