import type { Lesson } from "@tintelix/schema";

export const queueCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "Busy is not the same as fine",
    text: [
      "A worker that is busy a share ρ of the time makes requests wait about ρ ÷ (1 − ρ) times their own work.",
      "Bunched arrivals and uneven work times fill the line, not slow code.",
    ],
  },
  {
    heading: "The curve, for one worker",
    text: ["A request takes {slowdownAt50}× its own work at 50% busy, {slowdownAt80}× at 80%, {slowdownAt90}× at 90% and {slowdownAt95}× at 95%."],
  },
  {
    heading: "Little's law",
    text: [
      "Requests inside = arrivals a second × time each stays. At {traffic} a second and {responseMs} each, {inSystem} requests are inside at once.",
      "Size pools and connection limits from it, with room above the average: demand bunches too.",
    ],
  },
  {
    heading: "Headroom",
    text: [
      "Spare capacity is the response time you bought. Raising average busyness to save money is a latency change; label it as one.",
      "One shared line for several workers beats a separate line for each.",
    ],
  },
  {
    heading: "Watch the line, not just busy %",
    text: ["Busy % is an average over several seconds. A burst inside it can fill the line while the average looks calm, so watch line length and wait time too."],
  },
];
