import type { Model } from "@tintelix/schema";

const fin = (v: number | undefined, d: number) => (v !== undefined && Number.isFinite(v) ? v : d);

/** Which lines of the explainer show in each mode: 0 plain HTTP, 1 keys, 2 the certificate, 3 sealed data. */
const STAGE = [0, 1, 2, 3, 3];
/** The longest a public certificate may last: since 15 March 2026, and from 15 March 2029 (CA/Browser Forum). */
const CERT_DAYS = 200;
const CERT_DAYS_2029 = 47;

/**
 * TLS, timed to the first byte of the reply in round trips of `rttMs`: TCP's handshake (1), TLS 1.2's two
 * or TLS 1.3's one, then the request (1). QUIC sets up transport and TLS in one; resuming an earlier
 * session lets the request ride in the first flight. Modes: 0 plain HTTP, 1 keys, 2 the certificate,
 * 3 the handshake, 4 versions.
 */
export const tlsModel: Model = {
  defaults: { rttMs: 80, mode: 0 },
  run(i) {
    const rttMs = Math.min(1000, Math.max(1, fin(i.rttMs, 80)));
    const mode = Math.min(STAGE.length - 1, Math.max(0, Math.round(fin(i.mode, 0))));
    return {
      mode,
      tlsStage: STAGE[mode]!,
      rttMs,
      tls12FirstByteMs: (1 + 2 + 1) * rttMs,
      tls13FirstByteMs: (1 + 1 + 1) * rttMs,
      tls13SavedMs: rttMs,
      quicFirstByteMs: (1 + 1) * rttMs,
      resumedFirstByteMs: (1 + 1) * rttMs,
      quicResumedMs: rttMs,
      certDays: CERT_DAYS,
      certDays2029: CERT_DAYS_2029,
      renewalsPerYear: 365 / CERT_DAYS,
      renewals2029: 365 / CERT_DAYS_2029,
    };
  },
};
