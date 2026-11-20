import type { Step } from "@tintelix/schema";

const PEAK = { traffic: 90 };

export const queueSteps: Step[] = [
  {
    id: "half-busy",
    tag: "problem",
    title: "Half busy, and already waiting",
    short: "Half busy",
    text: [
      "The product service has one worker. Each request takes **{serviceMs}** of work, so the worker could answer {capacity} a second. Right now {traffic} arrive each second: it is **{utilPct}** busy.",
      "Half the capacity is spare, so you might expect no waiting. But shoppers don't arrive evenly; they bunch up, and each work time varies. A bunch has to wait in line, so a request waits **{waitMs}** on average before the worker starts, and takes **{responseMs}** in all.",
    ],
    note: { kind: "watch", text: "Watch the line in front of the worker. It forms and clears again and again, even with half the capacity spare." },
    sim: { mode: "steady", speed: 1 },
    model: { traffic: 50 },
    live: "LIVE · one worker",
  },
  {
    id: "the-curve",
    tag: "technique",
    title: "The curve bends, then goes vertical",
    short: "The curve",
    text: [
      "The curve shows response time against how busy the worker is. Up to about half busy it stays low. After that, each extra request a second costs more time than the last, and near full the curve shoots up.",
      "The rule behind it: a request waits about busy ÷ (1 − busy) times its own work. Try it: drag the traffic and watch the dot climb the curve and the line grow.",
    ],
    note: { kind: "idea", text: "Busy means the share of time the worker is working. The spare share is what soaks up the bunches." },
    sim: { mode: "steady", speed: 1 },
    model: { traffic: 50 },
    controls: ["traffic"],
    live: "LIVE · move the traffic",
  },
  {
    id: "evening-peak",
    tag: "problem",
    title: "The evening peak",
    short: "Peak",
    text: [
      "In the evening rush, {traffic} requests arrive each second. The worker is **{utilPct}** busy. On a dashboard that looks fine, with {sparePct} to spare.",
      "But a request now waits **{waitMs}** in line and takes **{responseMs}**, {slowdown} times its own work.",
      "Little's law counts the cost: {traffic} arrivals a second, each staying {responseMs}, means **{inSystem}** requests inside the service at once, each holding memory and a connection.",
    ],
    note: { kind: "turn", text: "Near the top of the curve, a little more traffic costs far more time than the same traffic lower down." },
    changed: [{ kind: "mod", label: "Response", value: "{responseMs}" }],
    sim: { mode: "steady", speed: 1 },
    model: PEAK,
    live: "LIVE · the evening peak",
  },
  {
    id: "add-worker",
    tag: "solution",
    title: "Add a worker, buy headroom",
    short: "Headroom",
    text: [
      "Add a second worker that takes requests from the same line. Each is now **{utilPct}** busy.",
      "The line rarely forms: a request waits **{waitMs}** on average and takes **{responseMs}**, and only {inSystem} are inside at once. The spare capacity is not waste; it is the response time you bought.",
      "Try it: change the number of workers.",
    ],
    note: { kind: "tip", text: "One shared line beats a separate line per worker: no request waits behind a slow one while another worker sits idle." },
    changed: [
      { kind: "add", label: "Second worker" },
      { kind: "mod", label: "Response", value: "{responseMs}" },
    ],
    sim: { mode: "steady", speed: 1 },
    model: { ...PEAK, workers: 2 },
    controls: ["workers"],
    live: "LIVE · two workers",
  },
  {
    id: "recap",
    tag: "recap",
    title: "What the line taught us",
    short: "Recap",
    text: [
      "Waiting depends on how busy a server is, not just on how fast it is. Up to half busy the line stays short; near full it explodes.",
      "Little's law ties it together: requests inside = arrivals a second × time each stays. Use it to size pools and connection limits, with room above the average.",
      "Keep headroom. With {workers} workers, {traffic} requests a second take **{responseMs}** each.",
    ],
    note: { kind: "next", text: "Coming up in Availability: why three reliable services in a row are less reliable than one." },
    sim: { mode: "steady", speed: 1 },
    model: { ...PEAK, workers: 2 },
    live: "LIVE · recap",
  },
];
