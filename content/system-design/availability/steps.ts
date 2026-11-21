import type { Step } from "@tintelix/schema";

const SHARED = { copies: 2, sharedPct: 0.05 };

export const availabilitySteps: Step[] = [
  {
    id: "every-team-green",
    tag: "problem",
    title: "Nobody broke their promise",
    short: "The chain",
    text: [
      "A checkout crosses {services} services in a row: Gateway, Auth, Catalog, Pricing and Stock. Each team promises **{perAvail}**, which allows {perDowntime} of downtime a month, and each keeps its promise.",
      "But a checkout needs every one of them at once. Along a path, availabilities multiply, so the checkout works only **{pathAvail}** of the time: **{pathDowntime}** of failure a month, {failedPerMillion} failed checkouts in every million. No team's dashboard shows it.",
    ],
    note: { kind: "watch", text: "Outages on stage happen 100 times as often as in real life, so you can see them. The numbers in the tiles are the real ones." },
    sim: { mode: "steady", speed: 1 },
    live: "LIVE · five services in a row",
  },
  {
    id: "every-hop",
    tag: "technique",
    title: "Every hop costs you",
    short: "Every hop",
    text: [
      "Try it: change how many services the checkout crosses. Each one multiplies in its own chance of being down.",
      "For the whole checkout to keep the promise one service makes, each of the {services} services would need **{neededEachAvail}**.",
    ],
    note: { kind: "idea", text: "Users never see one service's availability. They see the path their request takes." },
    sim: { mode: "steady", speed: 1 },
    controls: ["services"],
    live: "LIVE · change the path",
  },
  {
    id: "two-copies",
    tag: "solution",
    title: "Two copies of everything",
    short: "Copies",
    text: [
      "Run two copies of every service side by side. A service now fails only when both copies are down at once, so across copies the chances of being down multiply instead.",
      "Each service is now up **{tierAvail}**, and the checkout **{pathAvail}**: about **{pathDowntime}** down a month.",
      "Try it: change the number of copies.",
    ],
    note: { kind: "tip", text: "Copies help only if a request can move to the healthy one. That needs a health check and a load balancer, covered later in the course." },
    changed: [
      { kind: "add", label: "A second copy of each service" },
      { kind: "mod", label: "Down a month", value: "{pathDowntime}" },
    ],
    sim: { mode: "steady", speed: 1 },
    model: { copies: 2 },
    controls: ["copies"],
    live: "LIVE · two copies each",
  },
  {
    id: "shared-fate",
    tag: "problem",
    title: "Copies that fail together",
    short: "Shared fate",
    text: [
      "That arithmetic assumed the copies fail independently. They rarely do: they share a region, a deploy pipeline, a certificate. Say a bad deploy takes both copies down **{sharedPct}** of the time, about {sharedDowntime} a month.",
      "Now each service is up {tierAvail} and the checkout **{pathAvail}**: down **{pathDowntime}** a month. The shared failure, not the copies, sets the answer.",
      "Try it: change how often the copies fail together.",
    ],
    note: { kind: "turn", text: "Ask of every pair of copies: what do these two share, and can it fail?" },
    changed: [{ kind: "mod", label: "Down a month", value: "{pathDowntime}" }],
    sim: { mode: "shared", speed: 1 },
    model: SHARED,
    controls: ["sharedPct"],
    live: "LIVE · copies that share a deploy",
  },
  {
    id: "recap",
    tag: "recap",
    title: "What the nines taught us",
    short: "Recap",
    text: [
      "Along a path, availabilities multiply: every service a request needs makes it less likely to succeed.",
      "Across copies, the chances of being down multiply, but only as far as the copies are independent. With the shared failure, the checkout is still down **{pathDowntime}** a month.",
      "Two levers move the nines: fail less often, or recover faster. Recovering twice as fast helps as much as failing half as often, and it is usually cheaper.",
    ],
    note: { kind: "next", text: "Coming up in Back-of-envelope estimation: turning daily users into requests a second and storage." },
    sim: { mode: "shared", speed: 1 },
    model: SHARED,
    live: "LIVE · recap",
  },
];
