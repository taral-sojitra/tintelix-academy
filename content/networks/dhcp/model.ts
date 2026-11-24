import type { Model } from "@tintelix/schema";

const fin = (v: number | undefined, d: number) => (v !== undefined && Number.isFinite(v) ? v : d);

/** What the DHCP widget shows in each mode: 0 no settings, 1 the four messages, 2 settled with a lease. */
const STAGE = [0, 1, 2, 2];

/**
 * DHCP. A café's router hands out addresses from a pool of `poolSize`. `visitorsPerDay` arrive evenly over
 * the day and each stays less than a lease, so an address stays taken for `leaseHours` after its visitor
 * arrives (Little's law: held = arrivals per hour × hours held). When more are held than the pool has,
 * newcomers get no address. Devices renew at half the lease. Modes: 0 the problem, 1 the exchange,
 * 2 settled, 3 the pool.
 */
export const dhcpModel: Model = {
  defaults: { leaseHours: 4, visitorsPerDay: 300, poolSize: 100, mode: 0 },
  run(i) {
    const leaseHours = Math.min(168, Math.max(0.5, fin(i.leaseHours, 4)));
    const visitorsPerDay = Math.max(0, fin(i.visitorsPerDay, 300));
    const poolSize = Math.max(1, Math.round(fin(i.poolSize, 100)));
    const mode = Math.min(STAGE.length - 1, Math.max(0, Math.round(fin(i.mode, 0))));
    const held = (visitorsPerDay / 24) * leaseHours;
    return {
      mode,
      dhcpStage: STAGE[mode]!,
      messages: 4,
      leaseHours,
      renewHours: leaseHours / 2,
      visitorsPerDay,
      poolSize,
      held,
      poolUsedPct: Math.min(100, (held / poolSize) * 100),
      failPct: held > poolSize ? (1 - poolSize / held) * 100 : 0,
    };
  },
};
