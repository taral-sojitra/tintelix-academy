import type { Step } from "@tintelix/schema";

const SERVICES = ["orders", "search", "users_svc", "catalog", "payments", "shipping"];

export const microSteps: Step[] = [
  {
    id: "monolith",
    tag: "problem",
    title: "One codebase, one deploy line",
    short: "Monolith",
    text: [
      "The whole shop is one program: a checkout calls Users, Catalog, Payments and Shipping as plain function calls, {callUs} microseconds in all.",
      "But {teams} teams share it. They want {deploysPerDay} deploys a day, each takes {monoDeployMin} minutes, and only one can go at a time: the deploy line is busy **{deployLineHours} hours** a day, and one bad change rolls back everyone's.",
    ],
    note: { kind: "watch", text: "Every request lights the modules inside one box." },
    sim: { mode: "deploy", speed: 1 },
    live: "LIVE · monolith",
  },
  {
    id: "split",
    tag: "technique",
    title: "Split it along team lines",
    short: "Split",
    text: [
      "Give each team its own service, with its own code, database and deploys. A team now deploys in **{teamDeployMin} minutes** whenever it likes, with no shared line: {deployLineHours} hours of waiting.",
      "A bug in Shipping now breaks Shipping, not the whole shop.",
    ],
    note: { kind: "idea", text: "Split where the teams split. Services that always change together belong in one service." },
    changed: [{ kind: "mod", label: "Shop", value: "6 services" }],
    scene: { add: SERVICES, remove: ["mono"] },
    sim: { mode: "deploy", speed: 1 },
    model: { mode: 1 },
    live: "LIVE · microservices",
  },
  {
    id: "network-calls",
    tag: "problem",
    title: "Every call is now a network call",
    short: "Network",
    text: [
      "Checkout's {calls} calls now cross the network: **{callUs} microseconds** instead of a few, plus everything that can go wrong on a network.",
      "And checkout needs all five services up at once, so their availabilities multiply: **{checkoutAvail}**, or about **{checkoutDowntime}** down a month, where one process gave 99.9%.",
    ],
    note: { kind: "watch", text: "Each purple trip is a call that used to be a function call." },
    sim: { mode: "calls", speed: 1 },
    model: { mode: 1 },
    live: "LIVE · network calls",
  },
  {
    id: "scale-hot-part",
    tag: "technique",
    title: "Scale only the part that's busy",
    short: "Scale",
    text: [
      "A sale makes search {hotCopies} times busier. The monolith can only be copied whole: {hotCopies} copies take **{monoScaleGb} GB**.",
      "As services, only Search gets {hotCopies} copies; the rest keep two each: **{microScaleGb} GB**.",
    ],
    note: { kind: "tip", text: "Most of this can also come from a well-organised monolith run as several copies, until one part's load really differs." },
    sim: { mode: "scale", speed: 1 },
    model: { mode: 1 },
    live: "LIVE · scaling search",
  },
  {
    id: "recap",
    tag: "recap",
    title: "What splitting taught us",
    short: "Recap",
    text: [
      "A monolith is simple and fast inside ({callUs} microseconds for checkout's calls) but every team shares one deploy line.",
      "Microservices let teams deploy and scale on their own, at the price of network calls, lower combined availability and distributed transactions. Start with a well-organised monolith, and split when teams or load make it pay.",
    ],
    note: { kind: "next", text: "Coming up in Retries, timeouts and circuit breakers: keeping one slow service from taking the rest down." },
    scene: { add: ["mono"], remove: SERVICES },
    sim: { mode: "deploy", speed: 1 },
    live: "LIVE · recap",
  },
];
