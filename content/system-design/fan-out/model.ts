import type { Model } from "@tintelix/schema";

/**
 * A news feed. Fan-out on write (push) copies each post into every follower's feed, so opening a feed
 * is one read; fan-out workers write `fanoutCap` feed entries a second. A celebrity's post needs one
 * write per follower and only the spare capacity is free for it, so the last follower sees it after
 * followers ÷ spare seconds. Fan-out on read (pull) writes nothing extra but fetches from every account
 * you follow at each feed open. Hybrid pushes normal posts and pulls the few celebrities a reader
 * follows. Modes: 0 push, 1 push with a celebrity post at `postAt`, 2 pull, 3 hybrid. `elapsedSec` is
 * time since the step began. Numbers are this lesson's own example.
 */
export const fanoutModel: Model = {
  defaults: { posts: 5000, followers: 300, celebFollowers: 10_000_000, fanoutCap: 2_000_000, opens: 20000, follows: 200, celebsFollowed: 5, postAt: 1, mode: 0, elapsedSec: 600 },
  run(i) {
    const posts = Math.max(0, i.posts ?? 5000);
    const followers = Math.max(0, i.followers ?? 300);
    const celebFollowers = Math.max(0, i.celebFollowers ?? 10_000_000);
    const fanoutCap = Math.max(1, i.fanoutCap ?? 2_000_000);
    const opens = Math.max(0, i.opens ?? 20000);
    const follows = Math.max(1, i.follows ?? 200);
    const celebsFollowed = Math.max(0, i.celebsFollowed ?? 5);
    const postAt = Math.max(0, i.postAt ?? 1);
    const mode = Math.max(0, Math.min(3, Math.round(i.mode ?? 0)));
    const t = Math.max(0, i.elapsedSec ?? 600);

    const pushes = mode === 0 || mode === 1 || mode === 3;
    const feedWrites = pushes ? posts * followers : 0;
    const spare = Math.max(1, fanoutCap - feedWrites);
    const deliverSec = mode === 1 ? celebFollowers / spare : 0;
    const deliveredPct = mode === 1 ? (t < postAt ? 0 : Math.min(100, (100 * (t - postAt)) / deliverSec)) : 100;
    const perOpen = mode === 2 ? follows : mode === 3 ? 1 + celebsFollowed : 1;
    return {
      posts,
      followers,
      celebFollowers,
      fanoutCap,
      opens,
      follows,
      celebsFollowed,
      mode,
      elapsedSec: t,
      feedWrites,
      writeLoadPct: (100 * feedWrites) / fanoutCap,
      spare,
      deliverSec,
      deliveredPct,
      perOpen,
      lookups: opens * perOpen,
    };
  },
};
