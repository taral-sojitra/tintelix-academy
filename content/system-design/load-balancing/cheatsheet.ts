import type { Lesson } from "@tintelix/schema";

export const lbCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "What a balancer does",
    text: ["Spreads requests across servers so none drowns while others idle, and, with health checks, stops sending to servers that fail."],
  },
  {
    heading: "The policies, side by side",
    text: [
      "With {heavyPct} heavy reports at {traffic} requests a second on {servers} servers, lookups take: round robin {rrLookupMs}, least connections {lcLookupMs}, layer 7 by path {pathLookupMs}. One server alone serves only {singleServedPct}.",
      "Round robin is fair by count; least connections follows the live load; power of two choices (pick two at random, take the less busy) gets close to least connections cheaply.",
    ],
  },
  {
    heading: "Layer 4 vs layer 7",
    text: [
      "Layer 4 sees IP addresses and ports and moves connections unread: cheap and fast. Layer 7 reads each request: it can route by path, header or cookie and report per-request status, at more cost per request.",
      "A layer 7 balancer ends the client's TCP and TLS connections (so it holds the certificate) and opens its own to the server; a layer 4 one passes a single connection, TLS and all, straight through.",
    ],
  },
  {
    heading: "The fails-fast trap",
    text: ["A server that fails instantly holds no connections, so least connections sends it the most traffic. Health checks and outlier detection, not the policy, fix that."],
  },
];
