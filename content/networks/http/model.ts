import type { Model } from "@tintelix/schema";

const fin = (v: number | undefined, d: number) => (v !== undefined && Number.isFinite(v) ? v : d);

/** Browsers open up to 6 HTTP/1.1 connections to one site. */
const H1_CONNS = 6;

/**
 * HTTP and HTTPS, counted in round trips of `rttMs` (file sizes and bandwidth left out). Every version
 * fetches the HTML first, then the page's `resources` other files. HTTP/1.1: TCP + TLS setup (2), the
 * HTML (1), then 5 more connections (2) and one request per connection per round trip. HTTP/2: the same
 * setup and HTML, then every file at once on the one connection (1). HTTP/3: QUIC connects and encrypts
 * in one round trip, then the same as HTTP/2. Modes: 0 the page, 1 HTTP/1.1, 2 HTTP/2, 3 HTTP/3, 4 HTTPS.
 */
export const httpModel: Model = {
  defaults: { resources: 30, rttMs: 80, mode: 0 },
  run(i) {
    const resources = Math.min(500, Math.max(1, Math.round(fin(i.resources, 30))));
    const rttMs = Math.min(1000, Math.max(1, fin(i.rttMs, 80)));
    const mode = Math.min(4, Math.max(0, Math.round(fin(i.mode, 0))));

    const h1Rounds = Math.ceil(resources / H1_CONNS);
    const h1Res = (resources > 1 ? 2 : 0) + h1Rounds;
    const [h1Setup, h1Html] = [2, 1];
    const [h2Setup, h2Html, h2Res] = [2, 1, 1];
    const [h3Setup, h3Html, h3Res] = [1, 1, 1];
    const h1Ms = (h1Setup + h1Html + h1Res) * rttMs;
    const h2Ms = (h2Setup + h2Html + h2Res) * rttMs;
    const h3Ms = (h3Setup + h3Html + h3Res) * rttMs;

    return {
      mode,
      resources,
      rttMs,
      h1Conns: H1_CONNS,
      h1Rounds,
      h1Setup,
      h1Html,
      h1Res,
      h2Setup,
      h2Html,
      h2Res,
      h3Setup,
      h3Html,
      h3Res,
      h1Ms,
      h2Ms,
      h3Ms,
      h2SavedPct: (1 - h2Ms / h1Ms) * 100,
      h3SavedPct: (1 - h3Ms / h1Ms) * 100,
      h2On: mode >= 2 ? 100 : 0,
      h3On: mode >= 3 ? 100 : 0,
    };
  },
};
