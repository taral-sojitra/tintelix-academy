import type { Step } from "@tintelix/schema";

/** Steps 4 to 6: the product page fans out, and each call is slow 1% of the time. */
const FAN_OUT = { slowPct: 1, calls: 10 };

export const latencySteps: Step[] = [
  {
    id: "calm-dashboard",
    tag: "problem",
    title: "The dashboard says 12 ms",
    short: "Dashboard",
    text: [
      "Shoppers open the product page all day. The team's dashboard shows one number for it, the average response time: **{meanMs}**. The chart is flat and calm.",
      "Yet support keeps hearing the same complaint: sometimes the page just hangs. Watch the requests. Most come straight back, but now and then one sits in the service for a long time.",
    ],
    note: { kind: "watch", text: "An average can't tell you how many people waited, or for how long. It folds them all into one number." },
    sim: { mode: "average", speed: 1 },
    live: "LIVE · the dashboard",
  },
  {
    id: "two-humps",
    tag: "technique",
    title: "Two humps, nothing in between",
    short: "Histogram",
    text: [
      "Drop every finished request into a histogram: how many took each time. Two humps appear. **{fastPct}** come back in {fastMs}; **{slowPct}** take the slow path, such as a cold cache, a garbage-collection pause or a busy disk, and take {slowMs}.",
      "The average, **{meanMs}**, sits in the empty valley between them. Not one request took that long. Percentiles describe real requests instead: half finish within **{callP50Ms}** (p50), and 99% finish within **{callP99Ms}** (p99).",
      "At {perDay} requests a day, the slow hump is {slowPerDay} shoppers a day.",
    ],
    note: { kind: "idea", text: "The average isn't wrong arithmetic. It answers a question nobody asked." },
    changed: [
      { kind: "add", label: "Latency histogram" },
      { kind: "add", label: "p50", value: "{callP50Ms}" },
      { kind: "add", label: "p99", value: "{callP99Ms}" },
    ],
    scene: { add: ["histogram"] },
    sim: { mode: "histogram", speed: 1 },
    live: "LIVE · every request in the histogram",
  },
  {
    id: "watch-the-tail",
    tag: "technique",
    title: "Watch p99, not the average",
    short: "Watch p99",
    text: [
      "p99 is the time the slowest 1% of requests take at least. So it only asks one question: are more than 1% of requests slow?",
      "Try it: drag the slow share across 1%. p99 jumps from the fast hump to the slow one, while the average hardly moves. That is why goals and alerts belong on p99. An alert on the average would have stayed quiet.",
    ],
    note: { kind: "tip", text: "A percentile needs a load to go with it: \"p99 under 50 ms at the evening peak\" is a goal you can check." },
    sim: { mode: "histogram", speed: 1 },
    controls: ["slowPct"],
    live: "LIVE · move the slow share",
  },
  {
    id: "fan-out",
    tag: "problem",
    title: "Ten calls, and one is slow",
    short: "Fan-out",
    text: [
      "The product page isn't one call. It asks **{calls}** services at once, for the price, the stock, the reviews and more, and waits for the last answer.",
      "Each call is slow only **{slowPct}** of the time. But a page is slow if any of its calls is, so **{pageSlowPct}** of pages wait {slowMs}, and page p99 is **{pageP99Ms}**.",
    ],
    note: { kind: "turn", text: "Try 100 calls. The tail stops being rare: most pages hit it, and even the typical page is slow." },
    changed: [
      { kind: "add", label: "Services the page calls" },
      { kind: "mod", label: "Slow pages", value: "{pageSlowPct}" },
    ],
    scene: { add: ["services"] },
    sim: { mode: "fanout", speed: 1 },
    model: FAN_OUT,
    controls: ["calls"],
    live: "LIVE · a page fans out",
  },
  {
    id: "hedge",
    tag: "solution",
    title: "Ask twice, keep the first answer",
    short: "Hedge",
    text: [
      "If a call hasn't answered after **{hedgeMs}**, send the same call to another server and keep whichever answer comes first.",
      "Only calls on the slow path are still running then, so the extra work is **{hedgedPct}** of calls. The copy is almost always fast, so a hedged call finishes in {hedgeReplyMs} and page p99 falls to **{pageP99Ms}**. Pages that still wait {slowMs}: {pageSlowPct}.",
      "Try it: copy too early and every call is sent twice; too late and the copy can't beat the slow reply.",
    ],
    note: {
      kind: "watch",
      text: "Hedging helps when the slowness belongs to one server, such as a pause or a busy disk. A request that is slow everywhere, like the biggest customer's huge cart, is just sent twice.",
    },
    changed: [
      { kind: "add", label: "Copies of late calls", value: "{hedgedPct}" },
      { kind: "mod", label: "Page p99", value: "{pageP99Ms}" },
    ],
    sim: { mode: "hedge", speed: 1 },
    model: { ...FAN_OUT, hedge: 1 },
    controls: ["hedgeMs"],
    live: "LIVE · hedged calls",
  },
  {
    id: "recap",
    tag: "recap",
    title: "What the tail taught us",
    short: "Recap",
    text: [
      "The dashboard's average said all was well. A histogram shows the requests people actually wait for: watch p50 for the typical request and p99 for the tail, never only the average.",
      "Every extra call on a page is another chance to land in the tail, so pages meet the tail far more often than any one call does.",
      "Hedging trimmed page p99 to **{pageP99Ms}** for **{hedgedPct}** more calls. It works when the slowness belongs to one server, not to the request.",
    ],
    note: { kind: "next", text: "Coming up in Queueing: why the slow hump grows as a server gets busy." },
    sim: { mode: "hedge", speed: 1 },
    model: { ...FAN_OUT, hedge: 1 },
    live: "LIVE · recap",
  },
];
