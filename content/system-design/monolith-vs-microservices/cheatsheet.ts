import type { Lesson } from "@tintelix/schema";

export const microCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "Monolith",
    text: ["One deployable: calls between modules are function calls, one database, simple transactions. Many teams share one deploy line ({deployLineHours} hours a day in the example) and scale it only as a whole."],
  },
  {
    heading: "Microservices",
    text: ["One service per team, deployed and scaled on its own. Costs: network calls (latency and failure), availability that multiplies across a call chain ({checkoutAvail} for five at 99.9%), distributed transactions, and more to operate."],
  },
  {
    heading: "Choosing",
    text: ["Start with a modular monolith with clear boundaries. Split a part out when a team needs to deploy it alone or its load differs a lot from the rest."],
  },
];
