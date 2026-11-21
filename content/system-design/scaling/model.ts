import type { Model } from "@tintelix/schema";

/**
 * Scaling up: one machine of `cores` cores serves cores × perCore requests a second, up to the
 * biggest machine there is (`maxCores`). Scaling out: `nodes` machines of `nodeCores` each, whose
 * combined speedup follows Gunther's Universal Scalability Law, C(N) = N / (1 + σ(N−1) + κN(N−1)):
 * σ is contention (work that serializes, Amdahl's law) and κ is coherency (crosstalk between pairs
 * of nodes). Vintelix System Design 101, §5.3–5.4: 5% serial caps speedup at 20×; with σ = 0.03 and
 * κ = 0.0005 throughput peaks near 44 nodes at 13.6×, and 100 nodes give only 11.2×. Per-core rate
 * 200 a second as in Chapter 95.
 */
export const scalingModel: Model = {
  defaults: { traffic: 6000, cores: 16, maxCores: 64, perCore: 200, horizontal: 0, nodes: 16, nodeCores: 8, sigmaPct: 0, kappaPct: 0 },
  run(i) {
    const traffic = Math.max(0, i.traffic ?? 6000);
    const maxCores = Math.max(1, Math.round(i.maxCores ?? 64));
    const cores = Math.max(1, Math.min(maxCores, Math.round(i.cores ?? 16)));
    const perCore = Math.max(1, i.perCore ?? 200);
    const horizontal = (i.horizontal ?? 0) >= 0.5;
    const nodes = Math.max(1, Math.round(i.nodes ?? 16));
    const nodeCores = Math.max(1, Math.round(i.nodeCores ?? 8));
    const sigma = Math.max(0, (i.sigmaPct ?? 0) / 100);
    const kappa = Math.max(0, (i.kappaPct ?? 0) / 100);

    const usl = (n: number) => n / (1 + sigma * (n - 1) + kappa * n * (n - 1));
    const perNode = nodeCores * perCore;
    const speedup = usl(nodes);
    const verticalCapacity = cores * perCore;
    const horizontalCapacity = perNode * speedup;
    const capacity = horizontal ? horizontalCapacity : verticalCapacity;
    // Throughput peaks where adding a node stops helping; with no crosstalk it never turns down.
    const peakNodes = kappa > 0 ? Math.max(1, Math.round(Math.sqrt((1 - sigma) / kappa))) : Infinity;
    const peakSpeedup = kappa > 0 ? usl(peakNodes) : sigma > 0 ? 1 / sigma : Infinity;
    const finite = (x: number, cap: number) => (Number.isFinite(x) ? x : cap);
    return {
      traffic,
      cores,
      maxCores,
      perCore,
      horizontal: horizontal ? 1 : 0,
      nodes,
      nodeCores,
      sigmaPct: sigma * 100,
      kappaPct: kappa * 100,
      perNode,
      speedup,
      efficiencyPct: (100 * speedup) / nodes,
      verticalCapacity,
      maxVerticalCapacity: maxCores * perCore,
      horizontalCapacity,
      linearCapacity: perNode * nodes,
      capacity,
      servedPct: traffic > 0 ? Math.min(100, (100 * capacity) / traffic) : 100,
      utilPct: capacity > 0 ? Math.min(100, (100 * traffic) / capacity) : 100,
      // Shown only when finite; 9,999 stands for "no peak" so the numbers stay finite.
      peakNodes: finite(peakNodes, 9999),
      peakCapacity: finite(perNode * peakSpeedup, perNode * 9999),
      amdahlCeiling: sigma > 0 ? 1 / sigma : 9999,
    };
  },
};
