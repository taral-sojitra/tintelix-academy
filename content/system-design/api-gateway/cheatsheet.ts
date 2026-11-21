import type { Lesson } from "@tintelix/schema";

export const gatewayCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "What a gateway does",
    text: ["One entry point for clients: TLS, token checks, rate limits, routing by path, request logging. Services trust it instead of each repeating the checks ({authCopies} copy instead of {services})."],
  },
  {
    heading: "Aggregation",
    text: ["The gateway (or a backend for frontend) calls several services over the fast internal network and returns one answer, so a screen costs one phone round trip ({screenMs} in the example)."],
  },
  {
    heading: "Risks",
    text: ["It is in every request: run several copies behind a load balancer ({gatewayInstances} for {rps} requests a second), keep it thin, and keep business logic in the services."],
  },
];
