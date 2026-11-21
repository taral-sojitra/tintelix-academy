import type { Lesson } from "@tintelix/schema";

export const latencyCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "Read the histogram, not the average",
    text: [
      "A mix of fast and slow requests averages to a time no request takes.",
      "Report **p50** for the typical request and **p99** for the tail, and say at what load. Add p99.9 where escalations come from.",
    ],
  },
  {
    heading: "The numbers",
    text: [
      "With {fastPct} of requests at {fastMs} and {slowPct} at {slowMs}, the average is {meanMs}, p50 is {callP50Ms} and p99 is {callP99Ms}.",
      "At {perDay} requests a day, that is {slowPerDay} slow requests a day.",
    ],
  },
  {
    heading: "Fan-out makes the tail common",
    text: [
      "A page that waits for several calls is slow if any one of them is.",
      "With {slowPct} of calls slow, a page making 10 calls is slow {tenCallsSlowPct} of the time, and one making 100 calls {hundredCallsSlowPct}.",
    ],
  },
  {
    heading: "Hedged requests",
    text: [
      "Send a copy once a call has outlived the fast hump, and keep the first answer. The extra load is the share of calls still running at that moment.",
      "It helps only when the slowness belongs to one server, such as a pause or a busy disk. A request that is slow everywhere is just sent twice.",
    ],
  },
  {
    heading: "Dashboard traps",
    text: [
      "**Never average p99s** across servers or minutes. Merge the histograms, then take the percentile once.",
      "A load test that waits for each reply before sending the next never sees a stall (**coordinated omission**). Send at a fixed rate, and time each request from when it should have started.",
    ],
  },
  {
    heading: "How the percentiles here are counted",
    text: ["Nearest rank: p99 is the smallest time that at least 99% of requests finish within. So with exactly 1% of requests slow, p99 is still the fast time."],
  },
];
