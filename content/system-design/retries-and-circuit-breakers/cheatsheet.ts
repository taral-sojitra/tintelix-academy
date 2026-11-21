import type { Lesson } from "@tintelix/schema";

export const retryCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "Timeouts",
    text: ["Every network call gets one, and it must fit inside what its caller has left, with margin: here {orderUsedMs} of the order service's {gatewayTimeoutMs}, {marginMs} spare."],
  },
  {
    heading: "Retries",
    text: ["Only for operations that are safe to repeat. Back off exponentially (base × 2ⁿ, capped), add jitter so failed callers don't retry in sync, and limit the attempts. Retrying a slow service multiplies its load: {offered} a second offered for {rps} real requests."],
  },
  {
    heading: "Circuit breaker",
    text: ["Closed: calls pass and failures are counted. Open (after a failure rate, commonly 50%): calls fail at once for a wait ({openSec} here). Half-open: a few test calls; success closes it, failure reopens it."],
  },
];
