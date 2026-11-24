import type { Lesson } from "@tintelix/schema";

export const latencyCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "Speed of light",
    text: ["About 200 km per millisecond in fibre (300 in a vacuum). Rule of thumb: 1 ms of round trip per 100 km. {distanceKm} km: {propRttMs} round trip at best."],
  },
  {
    heading: "A round trip",
    text: ["Distance + router hops (~0.1 ms each, each way) + queues. Here {propRttMs} + {hopMs} + {queueMs} = {rttMs}."],
  },
  {
    heading: "A page",
    text: ["DNS, TCP, TLS, request: {roundsFirst} round trips to the first byte ({firstByteMs}), {roundsPage} for the page ({pageMs})."],
  },
  {
    heading: "Cutting it",
    text: ["Move closer (CDN edge {edgeKm} km away: page {edgePageMs}); cut round trips (reuse connections, TLS 1.3, HTTP/3, caching); keep queues short."],
  },
];
