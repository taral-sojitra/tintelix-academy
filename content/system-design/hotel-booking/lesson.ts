import type { Lesson } from "@tintelix/schema";
import { hotelCheatsheet } from "./cheatsheet";
import { hotelModel } from "./model";
import { hotelScene } from "./scene";
import { hotelSteps } from "./steps";

export const hotelBooking: Lesson = {
  id: "hotel-booking",
  home: "system-design",
  slug: "hotel-booking",
  topic: "Design hotel booking",
  title: "Never sell the same room twice",
  promise: "Let thousands of guests book four million rooms without ever selling one twice: let the database refuse overlapping bookings, hold rooms while guests pay, and keep fast, slightly stale search apart from exact booking.",
  minutes: 8,
  level: 2,
  scene: hotelScene,
  model: hotelModel,
  controls: {
    holdMin: {
      label: "Hold length",
      min: 5,
      max: 30,
      step: 1,
      unit: "min",
      readout: "**{heldRooms}** rooms held at once at peak, **{heldPct}** of all rooms.",
    },
  },
  steps: hotelSteps,
  components: ["users", "app-server", "cache", "database"],
  buildsOn: ["distributed-transactions", "idempotency"],
  questions: [],
  cheatsheetInputs: { mode: 5 },
  cheatsheet: hotelCheatsheet,
};
