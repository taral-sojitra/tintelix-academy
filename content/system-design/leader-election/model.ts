import type { Model } from "@tintelix/schema";

/** Seconds the vote is held on screen. A real vote is one round trip (about `rttMs`); stretched so it can be seen. */
export const VOTE_SHOWN_SEC = 1.5;
/** Scene second at which the leader dies, the network splits or the leader freezes. */
export const EVENT_AT_SEC = 1;

/**
 * Vintelix System Design 101, Chapters 6, 77 and 78. Five servers; a majority of 5 is 3, so 2 can fail
 * (§78.4). etcd's shipped defaults, a 100 ms heartbeat and a 1,000 ms election timeout (§6.3): when the
 * leader goes quiet, a follower waits the timeout, raises the term and asks for votes; the peers vote and
 * it leads the next term. Raising the timeout stops blips from starting elections but lengthens every
 * real failover by the same amount (§6.3); the blip rate here (200 a day, 250 ms on average, lengths
 * spread exponentially) is this lesson's assumption. A partition that leaves 2 on one side can't elect
 * there (§77.5). Fencing (§78.3, §78.5): every write carries the leader's term, 33 for n1 and 34 for n2;
 * storage keeps the highest it has seen and rejects lower ones, so n1's write after a long pause fails.
 * Modes: 0 steady, 1 the leader dies, 2 a 3–2 partition with n1 and n5 cut off, 3 n1 freezes for
 * `pauseSec`. `elapsedSec` is time since the step began; everything runs at real speed except the vote.
 */
export const leaderModel: Model = {
  defaults: {
    nodes: 5, heartbeatMs: 100, electionTimeoutMs: 1000, rttMs: 10, writeRate: 2000,
    blipsPerDay: 200, blipMeanMs: 250, term: 33, pauseSec: 5, mode: 0, elapsedSec: 600,
  },
  run(i) {
    const nodes = Math.max(1, Math.round(i.nodes ?? 5));
    const heartbeatMs = Math.max(1, i.heartbeatMs ?? 100);
    const electionTimeoutMs = Math.max(1, i.electionTimeoutMs ?? 1000);
    const rttMs = Math.max(0, i.rttMs ?? 10);
    const writeRate = Math.max(0, i.writeRate ?? 2000);
    const blipsPerDay = Math.max(0, i.blipsPerDay ?? 200);
    const blipMeanMs = Math.max(1, i.blipMeanMs ?? 250);
    const oldTerm = Math.round(i.term ?? 33);
    const pauseSec = Math.max(0, i.pauseSec ?? 5);
    const mode = Math.round(i.mode ?? 0);
    const t = Math.max(0, i.elapsedSec ?? 600);

    const majority = Math.floor(nodes / 2) + 1;
    const failoverMs = electionTimeoutMs + rttMs;
    const timeoutSec = electionTimeoutMs / 1000;
    const electAt = EVENT_AT_SEC + timeoutSec;
    const leadAt = electAt + VOTE_SHOWN_SEC;
    const started = mode !== 0 && t >= EVENT_AT_SEC;
    // Mode 3 only elects if the pause outlasts the timeout; n1 always wakes after the new leader is in.
    const elects = mode === 1 || mode === 2 || (mode === 3 && pauseSec > timeoutSec);
    const wakeAt = mode === 3 && elects ? Math.max(EVENT_AT_SEC + pauseSec, leadAt + 0.5) : EVENT_AT_SEC + pauseSec;

    let phase = 0;
    if (started && elects) phase = t < electAt ? 1 : t < leadAt ? 2 : 3;
    if (mode === 3 && elects && t >= wakeAt) phase = 4;
    const leader = !started || (mode === 3 && !elects) ? 1 : phase >= 3 ? 2 : 0;
    const voters = mode === 2 ? majority : nodes - 1;
    const votes = phase === 2 ? 1 + Math.floor(((t - electAt) / VOTE_SHOWN_SEC) * (voters - 1)) : phase >= 3 ? voters : 0;

    let n1State = 0;
    if (started) {
      if (mode === 1) n1State = 1;
      else if (mode === 2) n1State = 2;
      else if (mode === 3 && t < wakeAt) n1State = 3;
      else if (mode === 3 && elects) n1State = 4;
    }

    return {
      nodes, majority, canLose: nodes - majority, heartbeatMs, electionTimeoutMs, rttMs, writeRate, pauseSec,
      heartbeatRate: ((nodes - 1) * 1000) / heartbeatMs,
      failoverMs,
      waitingWrites: (writeRate * failoverMs) / 1000,
      falseElections: Math.round(blipsPerDay * Math.exp(-electionTimeoutMs / blipMeanMs)),
      mode, elapsedSec: t, phase, leader,
      candidate: phase === 2 ? 2 : 0,
      term: phase >= 2 ? oldTerm + 1 : oldTerm,
      oldTerm, newTerm: oldTerm + 1,
      votes,
      timerPct: phase === 1 ? Math.min(1, (t - EVENT_AT_SEC) / timeoutSec) : phase >= 2 ? 1 : 0,
      n1State,
      staleLeader: mode === 2 && started ? 1 : 0,
      majoritySize: mode === 2 ? majority : nodes,
      minoritySize: mode === 2 ? nodes - majority : 0,
      minorityCommitPct: 0,
      majorityCommitPct: mode === 2 ? (phase >= 3 ? 100 : 0) : 100,
      storageToken: phase >= 3 ? oldTerm + 1 : oldTerm,
      staleRejected: phase === 4 ? 1 : 0,
      // A write is accepted while some leader that is awake can reach a majority.
      commitPct: leader === 2 || (leader === 1 && n1State !== 3) ? 100 : 0,
      acceptedRate: leader === 2 || (leader === 1 && n1State !== 3) ? writeRate : 0,
    };
  },
};
