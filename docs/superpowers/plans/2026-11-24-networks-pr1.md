# Networks PR 1: ordered exchanges, shared lessons, the subject and lesson 1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** /networks lists 20 lessons in 6 modules; lesson 1 (OSI model) plays end to end; the shared Load balancers
entry links to System Design's lesson.

**Architecture:** Content and stage extensions only: a `sequence` flag on board modes, `home` on subject entries,
a Networks subject file, and lesson 1 as a board lesson with its own model and a header-stack widget.

**Spec:** `docs/superpowers/specs/2026-11-24-networks-subject-design.md`

## Global Constraints

- Every number in a step, tile or readout comes from the model; content checks enforce quoted outputs exist.
- Lesson ids `net-<slug>`; hook titles ≤ 40 characters; plain words; Markdown only `**bold**`.
- New CSS classes are checked against `stage.css` for prefixes that already exist.

## Review Focus

1. A shared entry must not appear twice on the Home page's continue card (test in Task 2).
2. A sequence mode with a flow whose boxes aren't on the board must skip it, not stall (test in Task 1).
3. A shared entry links to `/system-design/<slug>`, never `/networks/<slug>` (test in Task 2).

### Task 1: ordered exchanges on the board
- [ ] Test (`packages/stage/src/routers/board.test.ts`): with `ordered: true`, five spawns over flows a, b, c take
      a, b, c, a, b; a flow with weight 0 is skipped in turn.
- [ ] `BoardMode.sequence?: boolean` (schema); `BoardRouterState.ordered?(): boolean`; the board scene passes the
      current mode's flag; the router keeps a turn counter per mode.

### Task 2: shared lessons
- [ ] Tests: `lessonSummaries("networks")` gives the shared entry `href: "/system-design/load-balancing"` and
      `available: true`; own entries `href: "/networks/<slug>"`; Home's continue targets hold each lesson id once.
- [ ] `LessonStub.home?: SubjectId`; `LessonSummary.href`; LessonList, subject page, SubjectCard and Home use `href`.

### Task 3: the Networks subject and lesson 1
- [ ] Subject: 6 modules, 20 entries with hook titles and builds-on per the design; content tests for order,
      builds-on (other subjects' ids allowed) and the OSI lesson's model.
- [ ] Lesson 1: board scene (sender and receiver stacks of seven layers, the wire between), steps going down
      (headers added), across, up (headers removed), and where HTTP, TCP, IP and Ethernet sit; model: payload size
      → segments at MSS 1460, header bytes, overhead %; a `headers` custom widget showing the growing envelope.

### Task 4: verify and ship
- [ ] `pnpm check`, build, smoke flow `net_flow` (/networks counts, lesson 1 plays steps, shared link), stage audit,
      screenshots; PR.

## Recipe for lessons 2–20 (one stacked PR each)
Write model + test (numbers first), scene/board, steps, cheatsheet; add custom widgets in `net-widgets.ts` with a
test; add to `content/index.ts`; extend the smoke list; run check, build, smoke, stage audit; notes; PR.
