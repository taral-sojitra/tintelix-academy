# Lesson 56: Design orders and inventory — design note

**Hook title:** Sell only what's on the shelf. **Scene kind:** `board`. **Builds on:** distributed
transactions (21), message queues (22), idempotency (23). **Sources:** Vintelix System Design 101, Chapters
135 and 137 (paraphrased: 40 million stock rows, a normal day against a flash sale on one item,
check-then-write overselling, the guarded conditional update, the hot row's ceiling, sub-counters and a
queue in front, the orchestrated saga with compensations that can themselves fail).

## Assumptions (model defaults)

From the book: 2 million items × 20 warehouses, about 100 bytes a row; 10 million reads and 200,000 writes a
day; a 5,000-unit flash sale, 500,000 page loads and 50,000 buyers in 60 s. The lesson's own: about 2 s
between checking stock and subtracting it (charging the card); one row taking about 500 guarded updates a
second; 10 sub-counters; 150,000 orders a day with 3% of payments declined.

## What the numbers come to

40 million rows, 4 GB; 116 reads and 2.3 writes a second normally; 8,333 views and 833 checkouts a second
in the flash sale. Check, pay, subtract: 1,667 units oversold. Guarded update: none oversold, 45,000 told
sold out at once, but the row is 167% busy. 10 sub-counters: 17% each (2: 83%). 4,500 reservations
released a day.

## Steps

1 the ask · 2 check, charge, then subtract · 3 the flash sale oversells · 4 check and subtract in one
statement · 5 split the hot row (Try it: sub-counters) · 6 the order saga · 7 wrap-up.

## Engine changes in this PR

None: the saga is shown with the existing log widget, as the module spec planned ("reuses saga log").
