import type { Model } from "@tintelix/schema";

const fin = (v: number | undefined, d: number) => (v !== undefined && Number.isFinite(v) ? v : d);
const MONTH_SEC = 30 * 86_400;

/**
 * Design a web crawler (general public knowledge: URL frontier with per-host politeness queues,
 * URL-seen tests, content fingerprints, crawler traps, robots.txt). Assumptions, stated in the steps:
 * 2 billion pages a month at 80 KB each (compressed); a fetch takes about 500 ms; a plain queue sends 60%
 * of fetches to whichever site is at its head, and a site starts refusing above 10 requests a second;
 * one request a second per site to be polite; 40 links per page, 90% of them already known; 5 billion
 * known URLs; a quarter of pages duplicate others; a budget of 10,000 pages per site per crawl. Modes:
 * 0 one plain queue, 1 that queue on a link-heavy site, 2 per-host queues, 3 plus a URL-seen filter,
 * 4 a crawler trap.
 */
export const crawlerModel: Model = {
  defaults: {
    pagesPerMonth: 2e9, pageKb: 80, fetchMs: 500, hotSharePct: 60, siteRefuseAbove: 10, politeDelay: 1, linksPerPage: 40,
    knownPct: 90, knownUrls: 5e9, dupContentPct: 25, hostBudget: 10000, mode: 0,
  },
  run(i) {
    const pagesPerMonth = Math.max(0, fin(i.pagesPerMonth, 2e9));
    const pageKb = Math.max(0, fin(i.pageKb, 80));
    const fetchMs = Math.max(0, fin(i.fetchMs, 500));
    const hotSharePct = Math.min(100, Math.max(0, fin(i.hotSharePct, 60)));
    const siteRefuseAbove = Math.max(0.1, fin(i.siteRefuseAbove, 10));
    const politeDelay = Math.min(10, Math.max(0.1, fin(i.politeDelay, 1)));
    const linksPerPage = Math.max(0, fin(i.linksPerPage, 40));
    const knownPct = Math.min(100, Math.max(0, fin(i.knownPct, 90)));
    const knownUrls = Math.max(0, fin(i.knownUrls, 5e9));
    const dupContentPct = Math.min(100, Math.max(0, fin(i.dupContentPct, 25)));
    const hostBudget = Math.max(0, fin(i.hostBudget, 10000));
    const mode = Math.min(4, Math.max(0, Math.round(fin(i.mode, 0))));

    const pageRate = pagesPerMonth / MONTH_SEC;
    const perHost = mode >= 2;
    const hotHostRate = perHost ? 1 / politeDelay : mode === 1 ? (pageRate * hotSharePct) / 100 : 0;
    const hotFailPct = hotHostRate > siteRefuseAbove ? (1 - siteRefuseAbove / hotHostRate) * 100 : 0;
    const linkRate = pageRate * linksPerPage;
    const storageTb = (pagesPerMonth * pageKb * 1000) / 1e12;

    return {
      pagesPerMonth, pageKb, fetchMs, hotSharePct, siteRefuseAbove, politeDelay, linksPerPage, knownPct, knownUrls, dupContentPct, hostBudget, mode,
      pagesB: pagesPerMonth / 1e9,
      pageRate,
      fetchers: (pageRate * fetchMs) / 1000,
      storageTb,
      hotHostRate,
      hotFailPct,
      /** Sites being crawled at once, so every fetcher stays busy at one request per site per delay. */
      hostsInParallel: pageRate * politeDelay,
      linkRate,
      newUrlRate: (linkRate * (100 - knownPct)) / 100,
      seenPct: mode >= 3 ? knownPct : 0,
      /** A Bloom filter at a 1% false-positive rate needs about 9.6 bits per URL. */
      bloomGb: (knownUrls * 9.6) / 8 / 1e9,
      /** A hash set of 16-byte URL fingerprints. */
      setGb: (knownUrls * 16) / 1e9,
      dedupSavedTb: (storageTb * dupContentPct) / 100,
      trapPages: hostBudget,
      trapDrawPct: mode === 4 ? 20 : 0,
    };
  },
};
