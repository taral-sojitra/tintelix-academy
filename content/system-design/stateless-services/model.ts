import type { Model } from "@tintelix/schema";

/**
 * Sessions held in each server's memory, three ways (Vintelix System Design 101, Chapter 92):
 * round robin (a request finds its session only on the one server that holds it), sticky sessions
 * (the balancer pins each user to that server), or a shared session store every server reads. A
 * deploy that replaces one server loses its in-memory sessions; their users are all sent to log in
 * within `spikeSec` (§92.5's 5,000 users in about two seconds). The store adds one network read per
 * request plus an occasional expiry refresh (§92.7). `elapsedSec` is the time since the deploy so the
 * stage can play it; its default is long after the burst. The fleet and traffic are this lesson's
 * own example.
 */
export const sessionModel: Model = {
  defaults: { servers: 3, sessions: 15000, mode: 0, deploy: 0, spikeSec: 2, rps: 5000, baseMs: 150, lookupMs: 1, refreshPct: 20, elapsedSec: 600 },
  run(i) {
    const servers = Math.max(1, Math.round(i.servers ?? 3));
    const sessions = Math.max(0, i.sessions ?? 15000);
    const mode = Math.max(0, Math.min(2, Math.round(i.mode ?? 0)));
    const deploy = (i.deploy ?? 0) >= 0.5;
    const spikeSec = Math.max(0.1, i.spikeSec ?? 2);
    const rps = Math.max(0, i.rps ?? 5000);
    const baseMs = Math.max(0.1, i.baseMs ?? 150);
    const lookupMs = Math.max(0, i.lookupMs ?? 1);
    const refreshPct = Math.max(0, i.refreshPct ?? 20);
    const elapsedSec = Math.max(0, i.elapsedSec ?? 600);
    const shared = mode === 2;

    const perServer = sessions / servers;
    const lostPct = mode === 0 ? 100 * (1 - 1 / servers) : 0;
    const loggedOut = deploy && !shared ? perServer : 0;
    // During the burst, the replaced server's users (one in `servers`) are all sent to log in.
    const bursting = loggedOut > 0 && elapsedSec < spikeSec;
    const bouncedPct = mode === 0 ? lostPct : bursting ? 100 / servers : 0;
    const extraMs = shared ? lookupMs : 0;
    return {
      servers,
      sessions,
      mode,
      deploy: deploy ? 1 : 0,
      spikeSec,
      rps,
      baseMs,
      lookupMs,
      elapsedSec,
      perServer,
      lostPct,
      bouncedPct,
      loggedOut,
      loginSpike: loggedOut / spikeSec,
      requestMs: baseMs + extraMs,
      addedPct: (100 * extraMs) / baseMs,
      storeOps: shared ? rps * (1 + refreshPct / 100) : 0,
    };
  },
};
