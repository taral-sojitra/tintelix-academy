import type { Lesson } from "@tintelix/schema";

export const notifyCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "The numbers",
    text: ["{triggerRate} events a second ({triggerPeak} at peak). A {audienceM}-million broadcast in 5 minutes: {pushNeed} pushes, {emailNeed} emails, {smsNeed} SMS a second. An SMS gateway at {smsRate} a second needs {smsDrainSec}."],
  },
  {
    heading: "Shape",
    text: ["Ingest with 202 and a caller's event ID (409 on repeats); resolve the audience over enough partitions ({partitions} × 2,000/s = {resolveRate}/s); reserve (event, user, channel) with one atomic insert before fan-out; a queue and workers per channel, so a slow provider never blocks the others."],
  },
  {
    heading: "Failures",
    text: ["Dead push token: drop it. Hard bounce: suppress the address. Soft bounce or gateway timeout: back off and retry. Out of retries: dead-letter queue. Record status on provider acceptance and again on its delivery report."],
  },
];
