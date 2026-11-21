# Lesson 31: How to approach a design problem — design note

**Hook title:** Forty-five minutes, one whiteboard. **Scene kind:** `board`. **Builds on:** estimation (4).
**Source:** Vintelix System Design 101, Chapter 126 (the seven steps: requirements, capacity estimate,
API contract, data model, architecture, deep dive, bottlenecks). The chapter's own worked example is a
URL shortener; lesson 32 already covers that, so this lesson applies the steps to a different, small
problem of its own: voting for a live TV talent show.

## Assumptions (model defaults)

20 million viewers, half vote, all within 5 minutes, peak twice the average; 100 bytes a vote; one
database taking about 5,000 writes a second; workers writing 100 votes a batch.

## What the numbers come to

10 million votes; 33,333 a second on average, 66,667 at peak; 1 GB in all. Writing each vote straight to
the database: 1,333% busy, 93% of votes lost. A queue plus batches of 100: 667 writes a second, 13% busy,
nothing lost (batches of 10: 133% busy, but late writes wait in the queue). Database down: the queue's
backlog climbs and 0% of votes are lost.

## Steps and the clock

Each step sets `phase` (and `phaseEnd`), and the new **step clock** widget marks it on a 45-minute bar:
5 minutes each for requirements, estimates, API and data; 10 for the design; 10 for the deep dive; 5 for
weak spots. Steps: 1 ask · 2 numbers · 3 API and data (clock 3–4) · 4 simple design (mode 1) · 5 deep
dive: a queue and batches (mode 2, Try it: batch size) · 6 weak spots: the database dies (mode 3) ·
7 wrap-up.

## Engine changes in this PR

- `BoardFlow.from`: a flow can start at a box other than Users (here, queue → database batches), and
  replies ping that box. `checkContent` reports an unknown `from`.
- `stepclock` custom widget (with its own test), and its CSS.
- `formatOutput` groups thousands in percentages ("1,333%", not "1333%").

## Calls I made

- Step text never quotes the queue's backlog: step text is filled from the step's inputs, not the scene
  clock, so a growing number would disagree with the board. The board's tile and queue box show it live.
- A database that is down reports 0 writes a second rather than its last load.
