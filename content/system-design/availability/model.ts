import type { Model } from "@tintelix/schema";

/**
 * A checkout crosses `services` services in a row, each with `copies` copies side by side. Along a
 * path, availabilities multiply; across copies, unavailabilities multiply, plus any failure the
 * copies share (Vintelix System Design 101, §3.2 and §3.3: five 99.9% services give 99.50%, or
 * 3 h 39 min of failure in a 730.5-hour month; two 99% replicas give 99.99% on paper, but a shared
 * 0.05% failure mode pulls the pair to about 99.94%).
 */
const MONTH_HOURS = 730.5;
const MONTH_SEC = MONTH_HOURS * 3600;

export const availabilityModel: Model = {
  defaults: { perAvail: 99.9, services: 5, copies: 1, sharedPct: 0 },
  run(inputs) {
    const perAvail = Math.max(0, Math.min(100, inputs.perAvail ?? 99.9));
    const services = Math.max(1, Math.round(inputs.services ?? 5));
    const copies = Math.max(1, Math.round(inputs.copies ?? 1));
    const sharedPct = Math.max(0, inputs.sharedPct ?? 0);
    const u = 1 - perAvail / 100;
    const shared = copies >= 2 ? sharedPct / 100 : 0;
    // One service is down when all its copies are down at once, or when what they share fails.
    const tierDown = Math.min(1, Math.pow(u, copies) + shared);
    const path = Math.pow(1 - tierDown, services);
    const pathDown = 1 - path;
    return {
      perAvail,
      services,
      copies,
      sharedPct,
      perDowntime: u * MONTH_SEC,
      sharedDowntime: (sharedPct / 100) * MONTH_SEC,
      tierAvail: 100 * (1 - tierDown),
      tierDowntime: tierDown * MONTH_SEC,
      pathAvail: 100 * path,
      pathDowntime: pathDown * MONTH_SEC,
      failedPerMillion: pathDown * 1e6,
      nines: pathDown > 0 ? Math.min(9, -Math.log10(pathDown)) : 9,
      // What each service would need for the whole path to keep one service's promise. A
      // requirement rounds up (to 0.01%), so it is never shown as easier than it is.
      neededEachAvail: Math.min(100, Math.ceil(100 * Math.pow(perAvail / 100, 1 / services) * 100 - 1e-9) / 100),
    };
  },
};
