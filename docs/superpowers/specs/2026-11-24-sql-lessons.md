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
