import type { Model } from "@tintelix/schema";
import { erlangC } from "../queueing/model";

/**
 * Three product servers and a mix of cheap lookups and heavy reports (Vintelix System Design 101,
 * Chapter 27: round robin "can't notice" an expensive endpoint; least connections follows the live
 * load; a Layer 7 balancer can route by path). Waits use standard queueing results with random
 * arrivals: round robin as each server on its own line (M/G/1, Pollaczek–Khinchine), least
 * connections as one shared line (M/G/c with the Allen–Cunneen correction for uneven work), and
 * routing by path as a lookup pool and a report server. The traffic and request sizes are this
 * lesson's own example.
 */
export const POLICY = { single: 0, roundRobin: 1, leastConnections: 2, byPath: 3 } as const;
/** Stands for "overloaded: the line grows without end", so outputs stay finite. */
const OVERLOADED_MS = 9999;

/** Mean wait in ms on one server with random arrivals at `lambda` a second and work time moments in ms. */
function mg1Wait(lambda: number, es: number, es2: number): number {
  const rho = (lambda * es) / 1000;
  return rho < 1 ? (lambda * es2) / 1000 / (2 * (1 - rho)) : Infinity;
}

/** Mean wait in ms on `c` servers sharing one line, corrected for the spread of work times. */
function mgcWait(c: number, lambda: number, es: number, cv2: number): number {
  const a = (lambda * es) / 1000;
  if (a >= c) return Infinity;
  return ((erlangC(c, a) * es) / (c - a)) * ((1 + cv2) / 2);
}

function evaluate(i: Record<string, number | undefined>): Record<string, number> {
  {
    const traffic = Math.max(0, i.traffic ?? 150);
    const lightMs = Math.max(0.001, i.lightMs ?? 10);
    const heavyMs = Math.max(0.001, i.heavyMs ?? 200);
    const heavyPct = Math.max(0, Math.min(100, i.heavyPct ?? 2));
    const servers = Math.max(2, Math.round(i.servers ?? 3));
    const policy = Math.max(0, Math.min(3, Math.round(i.policy ?? POLICY.roundRobin)));
    const h = heavyPct / 100;
    const es = (1 - h) * lightMs + h * heavyMs;
    const es2 = (1 - h) * lightMs * lightMs + h * heavyMs * heavyMs;
    const cv2 = (es2 - es * es) / (es * es);
    const load = (traffic * es) / 1000;

    let waitMs = 0;
    let lookupWait = 0;
    let reportWait = 0;
    let servedPct = 100;
    let serverLoadPct = (100 * load) / servers;
    let reportServerLoadPct = 0;
    if (policy === POLICY.single) {
      serverLoadPct = 100 * load;
      servedPct = Math.min(100, 100 / Math.max(load, 1e-9));
      waitMs = lookupWait = reportWait = mg1Wait(traffic, es, es2);
    } else if (policy === POLICY.roundRobin) {
      waitMs = lookupWait = reportWait = mg1Wait(traffic / servers, es, es2);
    } else if (policy === POLICY.leastConnections) {
      waitMs = lookupWait = reportWait = mgcWait(servers, traffic, es, cv2);
    } else {
      // Lookups share every server but one; reports get that one to themselves.
      const lookups = traffic * (1 - h);
      const reports = traffic * h;
      lookupWait = mgcWait(servers - 1, lookups, lightMs, 0);
      const rho = (reports * heavyMs) / 1000;
      reportServerLoadPct = 100 * rho;
      reportWait = rho < 1 ? (rho * heavyMs) / (2 * (1 - rho)) : Infinity;
      waitMs = (1 - h) * lookupWait + h * reportWait;
      const lookupLoad = (lookups * lightMs) / 1000 / (servers - 1);
      serverLoadPct = 100 * Math.max(lookupLoad, rho);
      if (lookupLoad >= 1 || rho >= 1) servedPct = 100 / Math.max(lookupLoad, rho);
    }
    const overloaded = !Number.isFinite(waitMs) || !Number.isFinite(lookupWait) || !Number.isFinite(reportWait);
    const cap = (x: number) => (Number.isFinite(x) ? x : OVERLOADED_MS);
    const lookupMs = overloaded ? OVERLOADED_MS : lookupWait + lightMs;
    const reportMs = overloaded ? OVERLOADED_MS : reportWait + heavyMs;
    return {
      traffic,
      lightMs,
      heavyMs,
      heavyPct,
      servers,
      policy,
      workMs: es,
      serverLoadPct,
      reportServerLoadPct,
      servedPct: overloaded && policy !== POLICY.single && servedPct === 100 ? 100 / Math.max(serverLoadPct / 100, 1) : servedPct,
      overloaded: overloaded ? 1 : 0,
      waitMs: cap(waitMs),
      lookupMs,
      reportMs,
      avgMs: overloaded ? OVERLOADED_MS : (1 - h) * lookupMs + h * reportMs,
    };
  }
}

export const lbModel: Model = {
  defaults: { traffic: 150, lightMs: 10, heavyMs: 200, heavyPct: 2, servers: 3, policy: POLICY.roundRobin },
  run(i) {
    // Every policy's result at the same traffic, so the panel can compare them.
    const at = (policy: number) => evaluate({ ...i, policy });
    return {
      ...evaluate(i),
      singleServedPct: at(POLICY.single).servedPct!,
      rrLookupMs: at(POLICY.roundRobin).lookupMs!,
      lcLookupMs: at(POLICY.leastConnections).lookupMs!,
      pathLookupMs: at(POLICY.byPath).lookupMs!,
    };
  },
};
