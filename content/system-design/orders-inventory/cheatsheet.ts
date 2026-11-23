import type { Lesson } from "@tintelix/schema";

export const ordersCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "The numbers",
    text: ["{rowsM} million stock rows ({storageGb} GB); {readAvg} reads and {writeAvg} writes a second normally. A flash sale: {flashReads} page views and {flashWrites} checkouts a second on one item."],
  },
  {
    heading: "Never oversell",
    text: ["Check-then-write races: {oversold} units oversold when checks wait on payment. Use one guarded statement (… WHERE available ≥ 1) and read the row count. A hot row then serializes: split it into sub-counters and queue known rushes."],
  },
  {
    heading: "The order saga",
    text: ["Reserve stock with an expiry, authorize payment, confirm. Undo in reverse: release the reservation on a decline ({declinesPerDay} a day), void and release on a later failure. Record and retry undo steps idempotently."],
  },
];
