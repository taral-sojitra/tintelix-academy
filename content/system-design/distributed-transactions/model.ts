import type { Model } from "@tintelix/schema";

/**
 * One order touches three services, each with its own database: Orders, Payments and Inventory.
 * Without coordination, an Inventory failure after the charge leaves a broken order. Two-phase commit
 * makes it all or nothing, but each participant holds its locks from prepare to commit: its own work
 * plus two round trips, so a hot row takes at most 1000 ÷ lockMs orders a second; and if the
 * coordinator dies after prepare, participants keep their locks until it recovers. A saga commits each
 * step locally and, when a later step fails, runs compensations (refund, cancel) for the earlier ones.
 * Modes: 0 none, 1 2PC, 2 2PC with the coordinator down, 3 saga. Traffic, failure rate, timings and the
 * hot item's share are this lesson's own example.
 */
export const txnModel: Model = {
  defaults: { orders: 100, failPct: 2, rttMs: 10, workMs: 20, recoverSec: 30, hotPct: 30, mode: 0 },
  run(i) {
    const orders = Math.max(0, i.orders ?? 100);
    const fail = Math.max(0, Math.min(100, i.failPct ?? 2)) / 100;
    const rttMs = Math.max(0, i.rttMs ?? 10);
    const workMs = Math.max(1, i.workMs ?? 20);
    const recoverSec = Math.max(0, i.recoverSec ?? 30);
    const hot = Math.max(0, Math.min(100, i.hotPct ?? 30)) / 100;
    const mode = Math.max(0, Math.min(3, Math.round(i.mode ?? 0)));

    const twoPc = mode === 1 || mode === 2;
    const lockMs = twoPc ? workMs + 2 * rttMs : workMs;
    const hotMax = 1000 / lockMs;
    const hotDemand = orders * hot;
    return {
      orders,
      failPct: fail * 100,
      rttMs,
      workMs,
      recoverSec,
      mode,
      brokenRate: mode === 0 ? orders * fail : 0,
      lockMs,
      hotMax,
      hotDemand,
      hotTurnedAwayPct: hotDemand > hotMax ? 100 * (1 - hotMax / hotDemand) : 0,
      blockedOrders: mode === 2 ? hotDemand * recoverSec : 0,
      compRate: mode === 3 ? orders * fail : 0,
    };
  },
};
