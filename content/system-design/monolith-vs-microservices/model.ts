import type { Model } from "@tintelix/schema";

/**
 * One shop built two ways. Monolith: every module in one process and one deploy; `teams` teams
 * deploying `deploysPerTeam` times a day share one line, one deploy at a time, `monoDeployMin` each.
 * Microservices: each team deploys its own service, `svcDeployMin`, in parallel, but checkout's `calls`
 * calls become network calls (`netMs` each instead of `inProcUs`), and checkout now needs calls + 1
 * services up at once, so availabilities multiply (lesson 3). Scaling the hot search part: the monolith
 * copies everything (`monoGb` a copy), microservices copy only search (`svcGb` a copy) while the others
 * keep two copies each. Numbers are this lesson's own example.
 */
export const microModel: Model = {
  defaults: { teams: 8, deploysPerTeam: 2, monoDeployMin: 45, svcDeployMin: 15, calls: 4, inProcUs: 1, netMs: 1, svcAvail: 99.9, hotCopies: 10, monoGb: 4, svcGb: 0.5, otherServices: 5, mode: 0 },
  run(i) {
    const teams = Math.max(1, Math.round(i.teams ?? 8));
    const deploysPerTeam = Math.max(0, i.deploysPerTeam ?? 2);
    const monoDeployMin = Math.max(0, i.monoDeployMin ?? 45);
    const svcDeployMin = Math.max(0, i.svcDeployMin ?? 15);
    const calls = Math.max(0, Math.round(i.calls ?? 4));
    const inProcUs = Math.max(0, i.inProcUs ?? 1);
    const netMs = Math.max(0, i.netMs ?? 1);
    const svcAvail = Math.max(0, Math.min(100, i.svcAvail ?? 99.9));
    const hotCopies = Math.max(1, Math.round(i.hotCopies ?? 10));
    const monoGb = Math.max(0, i.monoGb ?? 4);
    const svcGb = Math.max(0, i.svcGb ?? 0.5);
    const otherServices = Math.max(0, Math.round(i.otherServices ?? 5));
    const micro = (i.mode ?? 0) >= 0.5;

    const deploysPerDay = teams * deploysPerTeam;
    const avail = micro ? 100 * Math.pow(svcAvail / 100, calls + 1) : svcAvail;
    return {
      teams,
      deploysPerTeam,
      monoDeployMin,
      calls,
      netMs,
      hotCopies,
      mode: micro ? 1 : 0,
      deploysPerDay,
      deployLineHours: micro ? 0 : (deploysPerDay * monoDeployMin) / 60,
      teamDeployMin: micro ? svcDeployMin : monoDeployMin,
      callUs: micro ? calls * netMs * 1000 : calls * inProcUs,
      checkoutAvail: avail,
      checkoutDowntime: (1 - avail / 100) * 30 * 86400,
      monoScaleGb: hotCopies * monoGb,
      microScaleGb: hotCopies * svcGb + otherServices * 2 * svcGb,
    };
  },
};
