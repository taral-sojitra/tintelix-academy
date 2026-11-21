import type { Model } from "@tintelix/schema";

/**
 * A phone app talking to `services` backend services. Without a gateway, each service checks sign-in
 * and limits its own callers, and the app talks to each address. A gateway is one front door: it checks
 * the token once, applies limits and routes by path, for `gatewayMs` a request. The home screen needs
 * `rounds` dependent calls: from the phone that is rounds × (phone round trip + work); aggregated at
 * the gateway it is one phone round trip plus rounds × (internal hop + work). The gateway sits in every
 * request, so it runs as ⌈requests ÷ per-instance⌉ + 1 instances. Numbers are this lesson's own example.
 */
export const gatewayModel: Model = {
  defaults: { services: 6, rttMs: 100, workMs: 20, internalMs: 1, gatewayMs: 2, rounds: 2, rps: 50000, perInstance: 10000, mode: 0 },
  run(i) {
    const services = Math.max(1, Math.round(i.services ?? 6));
    const rttMs = Math.max(0, i.rttMs ?? 100);
    const workMs = Math.max(0, i.workMs ?? 20);
    const internalMs = Math.max(0, i.internalMs ?? 1);
    const gatewayMs = Math.max(0, i.gatewayMs ?? 2);
    const rounds = Math.max(1, Math.round(i.rounds ?? 2));
    const rps = Math.max(0, i.rps ?? 50000);
    const perInstance = Math.max(1, i.perInstance ?? 10000);
    const mode = Math.max(0, Math.min(2, Math.round(i.mode ?? 0)));

    const gateway = mode >= 1;
    const screenMs = mode === 2 ? rttMs + gatewayMs + rounds * (internalMs + workMs) : rounds * (rttMs + workMs + (gateway ? gatewayMs : 0));
    return {
      services,
      rttMs,
      workMs,
      gatewayMs,
      rounds,
      rps,
      perInstance,
      mode,
      authCopies: gateway ? 1 : services,
      addresses: gateway ? 1 : services,
      screenMs,
      phoneCalls: mode === 2 ? 1 : rounds,
      gatewayInstances: Math.ceil(rps / perInstance) + 1,
    };
  },
};
