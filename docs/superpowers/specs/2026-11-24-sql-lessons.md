# SQL lessons: notes per lesson

The subject design (`2026-11-24-sql-subject-design.md`) and the HLD fix each lesson's topic, animation and builds-on.
These notes record what each lesson's tasks teach and any call made while writing it. Starters always run; most are
deliberately wrong in the way the lesson is about, so the first run's feedback teaches.

## 2. WHERE: Only the rows that match

- Tasks: a text test (Fitness products), a number test (orders over ₹10,000), the `= NULL` trap (starter returns
  nothing; the replay shows all 20 rows dropped at WHERE), and AND-before-OR (starter returns 15 rows; brackets or
  IN give 10).
- Call: the precedence task uses IN in its solution; brackets pass too, since the checker compares results.

## 3. ORDER BY: Who comes first?

- Tasks: cheapest first with a name tiebreaker, newest first with id DESC on the same day, three tied prices broken by
  stock, NULL cities moved to the top with NULLS FIRST, and sorting by an AS name. Every starter returns the right
  rows in the wrong order, so the feedback ranks each row.
- New build checks for all lessons: an ordered task's answer must sort to one order only (`sortTies` counts rows that
  tie on every key; it must be 0), and a starter must not already pass. The first closes the gap where a right
  answer could fail because tied rows came back in another order.

## 4. DISTINCT: Every city, once

- Tasks: categories once each; cities without the missing ones (the starter's DISTINCT keeps one NULL row, so it has
  one row too many); country and city pairs (DISTINCT covers every listed column); customer ids that ordered, sorted.
- The mistake note warns against DISTINCT as a cover for repeats a join caused, which lesson 10 comes back to.

## 5. LIMIT and OFFSET: The top five, then the next

- Tasks: top three by price; the five latest orders (the starter's LIMIT without ORDER BY gets the five oldest);
  page 2 at four a page; the 4th to 6th biggest orders. Solutions carry tiebreakers so the no-ties check passes, even
  where the learner's top rows don't tie.

## 6. COUNT, SUM, AVG: How many, how much?

- Tasks: count customers; customers and those with a city (`count(*)` against `count(city)`); revenue of delivered
  orders (WHERE runs before the sum); cheapest, dearest and average price; orders with a coupon and different coupons
  (`count(coupon)`, `count(DISTINCT coupon)`).
- Replay: a summary over a column now says how many NULLs it skipped ("count(city) skipped 4 NULLs"), the HLD's
  point for this lesson.
- Feedback: a one-row answer with the wrong value now reads "One row, as expected, but its values are different."

## 7. GROUP BY: Who spends the most?

- Tasks: orders per status; products and stock per category; spend per customer without cancelled orders, biggest
  first (the HLD mock-up's hook); orders per month (the starter groups by day, 55 groups instead of 10); customers per
  country and city, where missing cities form their own group.
- Call: the first starter is `SELECT status FROM orders`, not the erroring `SELECT status, count(*)`, because the HLD
  says starters always run. The hint invites the learner to try count(*) without GROUP BY and read the plain-word
  error, and the content check now enforces "starters run" for every lesson.
