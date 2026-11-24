import type { Lesson } from "@tintelix/schema";

export const paymentCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "The numbers",
    text: ["{attemptsM} million attempts a day: {avgRate}/s, {peakRate}/s at peak. {captureRate} captures and {refundRate} refunds a second. Charge first and {timeoutsPer10k} timeout in 10,000 is {dupsPerDay} double charges a day."],
  },
  {
    heading: "Exactly once",
    text: ["Insert a PENDING row keyed by the client's idempotency key and commit, then call the network, then update the row. A retry finds the row and asks the network for status instead of charging again."],
  },
  {
    heading: "Ledger and reconciliation",
    text: ["Authorize (hold), capture (move), void, refund: new records, never edits. Double-entry: every movement a debit and an equal credit ({ledgerRowsM} million rows a day). Reconcile nightly; sweep stuck PENDING rows; circuit-break a failing network."],
  },
];
