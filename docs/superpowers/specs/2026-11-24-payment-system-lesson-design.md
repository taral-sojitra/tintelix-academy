# Lesson 57: Design a payment system — design note

**Hook title:** Take the money exactly once. **Scene kind:** `board`. **Builds on:** distributed
transactions (21), idempotency (23), retries and circuit breakers (28). **Sources:** Vintelix System Design
101, Chapter 136 (paraphrased: correctness over throughput, 20 million attempts a day, one failure in
10,000 becoming about 2,000 double charges a day, "write the intent before you spend the money", the
PENDING row keyed by the idempotency key, asking the network for status after a crash, authorize, capture,
void and refund). General public knowledge for double-entry ledgers and nightly reconciliation.

## Assumptions (model defaults)

From the book: 20 million attempts a day, 3× peak; 97% authorized, 95% of those captured; refunds 2% of
captures; one timeout in 10,000. The lesson's own: two ledger rows per capture or refund.

## What the numbers come to

231 attempts a second, 694 at peak; 213 captures a second (640 at peak); 4.3 refunds a second. Charge
first: 2,000 double charges a day (5 in 10,000: 10,000). Intent first: 0. 38 million ledger rows a day.

## Steps

1 the ask · 2 charge, then record · 3 the crash between charge and record · 4 write the intent first (Try
it: timeouts per 10,000) · 5 authorize, capture, and a ledger that balances · 6 trust, but reconcile ·
7 wrap-up.

## Engine changes in this PR

- `ledger` custom widget (with a test): three movements (capture, fee, partial refund) as debit and credit
  rows, with the balance shown. Class prefix `.tx-dbl` (`.tx-led` would match `.tx-leds`).
