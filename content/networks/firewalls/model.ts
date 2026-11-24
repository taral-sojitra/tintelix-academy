import type { Model } from "@tintelix/schema";

const fin = (v: number | undefined, d: number) => (v !== undefined && Number.isFinite(v) ? v : d);

/** Linux's client port range, which a stateless firewall must leave open for replies. */
const EPHEMERAL = 60999 - 32768 + 1;
/** What the rules widget shows in each mode: 0 no firewall, 1 stateless rules, 2 stateful. */
const STAGE = [0, 1, 2, 2, 2];

/**
 * Firewalls. The server runs three services (web :443, SSH :22, database :5432). Scanners send
 * `probesPerMin` probes, spread over those three ports. With rules, only :443 is open to everyone (SSH is
 * open to the office only), so two in three probes are dropped. A stateless firewall can only let replies
 * in by opening the whole client port range; a stateful one lets in exactly the replies it expects.
 * Modes: 0 no firewall, 1 rules, 2 state, 3 default deny, 4 layers.
 */
export const firewallModel: Model = {
  defaults: { probesPerMin: 300, mode: 0 },
  run(i) {
    const probesPerMin = Math.max(0, fin(i.probesPerMin, 300));
    const mode = Math.min(STAGE.length - 1, Math.max(0, Math.round(fin(i.mode, 0))));
    const stage = STAGE[mode]!;
    const exposedPorts = stage === 0 ? 3 : 1;
    const reachedPerMin = (probesPerMin * exposedPorts) / 3;
    return {
      mode,
      fwStage: stage,
      probesPerMin,
      exposedPorts,
      reachedPerMin,
      blockedPerMin: probesPerMin - reachedPerMin,
      scanBlockedPct: stage === 0 ? 0 : 100,
      dbOpenPct: stage === 0 ? 100 : 0,
      replyBlockedPct: stage === 1 ? 100 : 0,
      statelessHole: EPHEMERAL,
      statefulHole: 0,
      listening: 3,
    };
  },
};
