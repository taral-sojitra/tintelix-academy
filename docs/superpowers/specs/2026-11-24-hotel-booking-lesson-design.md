# Lesson 55: Design hotel booking — design note

**Hook title:** Never sell the same room twice. **Scene kind:** `board`. **Builds on:** distributed
transactions (21), idempotency (23). **Sources:** Vintelix System Design 101, Chapter 134 (paraphrased: the
no-overlap invariant, 50 searches per booking, check-then-act as a race that snapshot isolation doesn't
stop, an exclusion constraint or a room lock as the fix, holds during payment, overbooking as a pricing
decision). All other numbers are the lesson's own and deliberately differ from the well-known textbook
example.

## Assumptions (model defaults)

From the book: 50,000 properties × 80 rooms; 20 million searches a day, 2% converting; 4× peaks; overbooking
to 105%. The lesson's own: 2 in 1,000 bookings racing at peak; 10-minute holds, half ending in a booking; 95%
of searches from an availability cache.

## What the numbers come to

4 million rooms; 400,000 bookings a day (4.6 a second); 926 searches and 19 bookings a second at peak.
Check-then-insert: 800 rooms a day sold twice. Holds: 37 a second, 22,222 rooms held at once (0.56%; 30
minutes: 66,667). Search cache: 46 database reads a second.

## Steps

1 the ask · 2 check, then insert · 3 two guests, one room · 4 let the database refuse · 5 holds and retries
(Try it: hold length) · 6 search fast, book carefully · 7 wrap-up.

## Engine changes in this PR

- `locking` custom widget (with a test): two guests racing for the last room, phase by phase; without a
  refusal both are booked, with a lock the second waits and gets a 409.
