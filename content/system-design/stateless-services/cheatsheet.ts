import type { Lesson } from "@tintelix/schema";

export const sessionCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "Stateless, precisely",
    text: ["A stateless server keeps nothing in its own memory or disk that a later request depends on. The usual offenders: in-memory sessions, in-process caches, files written to local disk."],
  },
  {
    heading: "Round robin with in-memory sessions",
    text: ["A request finds its session only on the one server holding it: one time in {servers}, so {lostPct} lose their login."],
  },
  {
    heading: "Sticky sessions",
    text: [
      "Pin each user to one server with a balancer cookie, a hash of the client address, or a hash of the session id. It overrides load balancing, and losing that server loses its sessions.",
      "One replaced server here logs out {loggedOut} users: {loginSpike} logins a second, which looks like an attack.",
    ],
  },
  {
    heading: "Shared session store",
    text: ["Store sessions in Redis or Valkey with an expiry, and read them on every request: about {lookupMs} added per request, and {storeOps} operations a second on the store at {rps} requests a second."],
  },
];
