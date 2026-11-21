import type { Model } from "@tintelix/schema";

/**
 * One timeline (Vintelix System Design 101, Chapter 47's guarantees, with Chapter 44's lag): Asha
 * posts at 0 ms; replica 1 (near Asha) gets it after `lag1Ms`, replica 2 (near Ben) after `lag2Ms`.
 * Asha reloads at `ashaReadAt`. Chen, who saw the post, replies at `replyAt`; replies live on another
 * shard whose leader is near replica 2, so the reply reaches replica 2 after only `replyLag2Ms`. Ben
 * reads replica 2 at `benReadAt`. Modes: 0 eventual, 1 read-your-writes, 2 causal (a replica holds a
 * write until what it depends on has arrived), 3 strong (every read goes to the leaders, `rttMs` away
 * for Ben). Times are this lesson's own example.
 */
export const consistencyModel: Model = {
  defaults: { mode: 0, lag1Ms: 100, lag2Ms: 300, ashaReadAt: 50, replyAt: 150, replyLag2Ms: 20, benReadAt: 200, localMs: 1, rttMs: 70 },
  run(i) {
    const mode = Math.max(0, Math.min(3, Math.round(i.mode ?? 0)));
    const lag1Ms = Math.max(0, i.lag1Ms ?? 100);
    const lag2Ms = Math.max(0, i.lag2Ms ?? 300);
    const ashaReadAt = Math.max(0, i.ashaReadAt ?? 50);
    const replyAt = Math.max(0, i.replyAt ?? 150);
    const replyLag2Ms = Math.max(0, i.replyLag2Ms ?? 20);
    const benReadAt = Math.max(0, i.benReadAt ?? 200);
    const localMs = Math.max(0, i.localMs ?? 1);
    const rttMs = Math.max(0, i.rttMs ?? 70);

    const strong = mode === 3;
    const causal = mode === 2;
    const postVisible2 = lag2Ms;
    const replyArrives2 = replyAt + replyLag2Ms;
    // Under causal consistency the reply is held until the post it depends on is visible.
    const replyVisible2 = causal ? Math.max(replyArrives2, postVisible2) : replyArrives2;
    const ashaSees = mode >= 1 || ashaReadAt >= lag1Ms ? 1 : 0;
    const benPost = strong || benReadAt >= postVisible2 ? 1 : 0;
    const benReply = strong || benReadAt >= replyVisible2 ? 1 : 0;
    return {
      mode,
      lag1Ms,
      lag2Ms,
      ashaReadAt,
      replyAt,
      benReadAt,
      localMs,
      rttMs,
      ashaSees,
      benPost,
      benReply,
      anomaly: benReply && !benPost ? 1 : 0,
      replyArrives2,
      replyVisible2,
      convergeMs: Math.max(postVisible2, replyArrives2, replyAt + lag1Ms),
      readMs: strong ? rttMs : localMs,
    };
  },
};
