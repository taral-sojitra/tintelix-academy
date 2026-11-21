# Distributed transactions lesson ("One order, three services")

Status: built on Taral's standing go-ahead · 2026-11-21

**Intent.** Lesson 21 of System Design: an order spans Orders, Payments and Inventory, each with its own database. Without coordination a failure leaves it half done; two-phase commit makes it atomic but holds locks across round trips and blocks if the coordinator dies after prepare; a saga commits each step and compensates the completed ones on failure.

**Approach (my call).** A `txn` scene: shoppers → Checkout (the coordinator) → the three services. No coordination and saga: each order visits the services in turn; an Inventory failure turns red (half done) or runs amber compensations back through Payments and Orders. 2PC: violet prepare and vote, then green commit, and the participant glows purple while locked. Coordinator down: every participant shows "locked, waiting for checkout" and new orders fail. Failures are shown 1 order in 4 (labelled in the live tag); the numbers use the real 2%.

**Model.** 100 orders a second, 2% Inventory failures: 2 broken orders a second without coordination. 2PC: locks held work + 2 round trips = 20 + 2 × 10 = 40 ms, so a hot item takes 1000 ÷ 40 = 25 orders a second against 30 wanted (17% turned away). Coordinator down for 30 s: 30 × 30 = 900 hot-item orders blocked. Saga: 0 broken, 2 compensations a second, hot item back to 50 a second.

| # | id | Title | Key numbers |
|---|---|---|---|
| 1 | half-done | One order, three databases | 2 broken a second |
| 2 | two-phase | Two-phase commit: all or nothing | 40 ms locks; hot item 25 against 30 wanted |
| 3 | coordinator-down | The coordinator dies holding the locks | 900 orders blocked for 30 s |
| 4 | saga | A saga undoes the steps already done | 0 broken, 2 compensations a second, 50 a second |
| 5 | recap | What distributed transactions taught us | points to message queues |

**Rulings.** The visual failure rate (1 in 4) is higher than the model's 2% so failures are visible; the live tag says so. The lesson has no Try-it control.
