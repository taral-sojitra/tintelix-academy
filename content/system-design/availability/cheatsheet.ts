import type { Lesson } from "@tintelix/schema";

export const availabilityCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "The nines",
    text: [
      "{perAvail} allows {perDowntime} of downtime a month. Each extra nine cuts that tenfold.",
      "Past three nines, recovery has to be automatic: nobody can be paged and act that fast.",
    ],
  },
  {
    heading: "Paths multiply",
    text: [
      "{services} services in a row at {perAvail} each give {pathAvail}: {pathDowntime} down a month.",
      "For the whole path to keep one service's promise, each would need {neededEachAvail}.",
    ],
  },
  {
    heading: "Copies multiply the other way",
    text: [
      "Copies side by side are down together far less often, but only if nothing they share can fail.",
      "Down time of a pair ≈ the independent part + the shared part. The shared part usually wins: ask what the copies share.",
    ],
  },
  {
    heading: "Two levers",
    text: ["Availability = time between failures ÷ (time between failures + time to recover). Recovering twice as fast gains as much as failing half as often, and it is usually cheaper."],
  },
];
