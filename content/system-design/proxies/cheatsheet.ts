import type { Lesson } from "@tintelix/schema";

export const proxyCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "Forward proxy",
    text: ["Sits with the clients and speaks for them: one outgoing address, filtering, a shared cache. {employees} staff fetching {updateMb} MB each: {officeGb} GB without it, {proxyGb} GB with it."],
  },
  {
    heading: "Reverse proxy",
    text: ["Sits with the servers and speaks for them: hides their addresses, holds the TLS certificate in one place, routes by path, buffers slow clients."],
  },
  {
    heading: "Slow clients and Little's law",
    text: [
      "Workers held = traffic × hold time. Without buffering a worker waits for the client's download; with it, only for its own work.",
      "At {rps} requests a second with {slowPct} slow clients, passing responses straight through holds a worker {holdMs} and keeps {busyWorkers} workers busy.",
    ],
  },
  {
    heading: "Streams",
    text: ["Turn buffering off for responses meant to stream (server-sent events, live progress, token-by-token output), and only for those routes."],
  },
];
