import type { Step } from "@tintelix/schema";

const PEAK = { traffic: 20000 };
const FLEET = { ...PEAK, horizontal: 1, nodes: 16 };
const SHARED = { ...FLEET, sigmaPct: 3, kappaPct: 0.05 };

export const scalingSteps: Step[] = [
  {
    id: "scale-up",
    tag: "technique",
    title: "Scale up: a bigger box",
    short: "Scale up",
    text: [
      "The shop serves **{traffic}** requests a second at its busiest hour. The simplest answer is one bigger machine: each core handles about {perCore} a second, so {cores} cores handle **{capacity}** a second.",
      "Try it: give the server more cores until it keeps up.",
    ],
    note: { kind: "idea", text: "Scaling up changes nothing in the code. That is its whole appeal." },
    sim: { mode: "steady", speed: 1 },
    model: { traffic: 6000, cores: 16 },
    controls: ["cores"],
    live: "LIVE · one server",
  },
  {
    id: "ceiling",
    tag: "problem",
    title: "The biggest box runs out",
    short: "Ceiling",
    text: [
      "Traffic grows to **{traffic}** a second. You keep buying bigger machines until there are no bigger ones: {maxCores} cores handle {maxVerticalCapacity} a second, so only **{servedPct}** of requests are served.",
      "And it is still one machine. When it fails, or restarts for an upgrade, the whole shop is down.",
    ],
    note: { kind: "watch", text: "Red requests are the ones the server had no room for." },
    changed: [{ kind: "mod", label: "Served", value: "{servedPct}" }],
    sim: { mode: "steady", speed: 1 },
    model: { ...PEAK, cores: 64 },
    live: "LIVE · the biggest machine",
  },
  {
    id: "scale-out",
    tag: "solution",
    title: "Scale out: more boxes",
    short: "Scale out",
    text: [
      "Instead, run many ordinary servers of {nodeCores} cores behind a load balancer that spreads requests across them. If nothing is shared, {nodes} servers do {speedup}× the work of one: **{capacity}** a second, enough for everyone.",
      "There is no ceiling: add servers as traffic grows, and lose only a slice of capacity when one fails. Try it: change the number of servers.",
    ],
    note: { kind: "tip", text: "Scaling out needs work that splits: any server must be able to answer any request. That is why app servers keep no state of their own." },
    changed: [
      { kind: "add", label: "Load balancer" },
      { kind: "add", label: "Fleet", value: "{nodes} servers" },
    ],
    scene: { add: ["lb", "fleet", "curve"], remove: ["big"] },
    sim: { mode: "steady", speed: 1 },
    model: FLEET,
    controls: ["nodes"],
    live: "LIVE · many servers",
  },
  {
    id: "shared-parts",
    tag: "problem",
    title: "Shared parts bend the curve",
    short: "Shared parts",
    text: [
      "Real servers share things: a database lock every write waits for, and chatter to keep caches in step. Say {sigmaPct} of the work serializes and each pair of servers costs {kappaPct} in crosstalk.",
      "Now {nodes} servers do only **{speedup}×** the work of one: **{capacity}** a second, {servedPct} served. Throughput peaks at **{peakNodes}** servers, {peakCapacity} a second, and beyond that adding servers makes it slower. Try it: go past the peak.",
    ],
    note: { kind: "turn", text: "To go further, remove the shared part: cache the reads, split the data. That is what the coming lessons do." },
    changed: [{ kind: "mod", label: "Speedup", value: "{speedup}×" }],
    sim: { mode: "steady", speed: 1 },
    model: SHARED,
    controls: ["nodes"],
    live: "LIVE · shared parts",
  },
  {
    id: "recap",
    tag: "recap",
    title: "What scaling taught us",
    short: "Recap",
    text: [
      "Scale up first: it's simple and changes no code, until the biggest machine runs out and its single point of failure starts to hurt.",
      "Scale out for no ceiling and for surviving failures, but only for work that splits. Shared parts cap the gain and then reverse it: here the fleet peaks at {peakNodes} servers. Measure the shared part with a load test, then remove it.",
    ],
    note: { kind: "next", text: "Coming up in Load balancing: how the balancer chooses a server." },
    sim: { mode: "steady", speed: 1 },
    model: SHARED,
    live: "LIVE · recap",
  },
];
