import { SqlLesson } from "@tintelix/schema";
import { buildReplay, checkSqlTask, openShop, runInRollback, sortTies, type Db } from "@tintelix/sql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getSqlLesson, getSubject, lessonSummaries, sqlLessons } from "../index";

let db: Db;
beforeAll(async () => { db = await openShop(); }, 30000);
afterAll(async () => { await db.close?.(); });

const HLD_ORDER = ["select", "where", "order-by", "distinct", "limit-offset", "aggregates", "group-by", "having", "case-when", "inner-join", "left-join", "cte", "row-number", "insert", "update", "delete", "create-table", "alter-table", "create-index", "drop-table", "truncate"];

describe("the SQL subject", () => {
  it("lists 21 lessons in five modules, in the HLD's order", () => {
    const sql = getSubject("sql")!;
    expect(sql.modules.map((m) => m.title)).toEqual(["Reading rows", "Summarising", "Combining tables", "Changing data", "Defining tables"]);
    expect(lessonSummaries("sql").map((l) => l.slug)).toEqual(HLD_ORDER);
  });

  it("opens the written lessons", () => {
    const all = lessonSummaries("sql");
    expect(all[0]).toMatchObject({ id: "sql-select", order: 1, available: true, title: "Pick the columns you need" });
    expect(all.filter((l) => l.available).map((l) => l.id)).toEqual(sqlLessons.map((l) => l.id));
  });

  it("only builds on lessons that come earlier", () => {
    const order = lessonSummaries("sql").map((l) => l.id);
    for (const stub of getSubject("sql")!.modules.flatMap((m) => m.lessons)) {
      for (const b of stub.buildsOn) expect(order.indexOf(b), `${stub.id} builds on ${b}`).toBeLessThan(order.indexOf(stub.id));
    }
  });

  it("finds a lesson by slug", () => {
    expect(getSqlLesson("select")?.id).toBe("sql-select");
    expect(getSqlLesson("nope")).toBeUndefined();
  });
});

describe.each(sqlLessons.map((l) => [l.slug, l] as const))("SQL lesson %s", (_, lesson) => {
  const stub = getSubject("sql")!.modules.flatMap((m) => m.lessons).find((s) => s.id === lesson.id);

  it("matches the schema and its listing", () => {
    expect(SqlLesson.safeParse(lesson).error?.issues ?? []).toEqual([]);
    expect(stub, "listed in the SQL subject").toBeDefined();
    expect({ slug: lesson.slug, topic: lesson.topic, title: lesson.title, buildsOn: lesson.buildsOn })
      .toEqual({ slug: stub!.slug, topic: stub!.topic, title: stub!.title, buildsOn: stub!.buildsOn });
  });

  it.each(lesson.tasks.map((t) => [t.id, t] as const))("task %s: starter runs, solution passes, answer is sound", async (_, task) => {
    const starter = await runInRollback(db, task.starter);
    expect(starter.outcome.ok ? "" : starter.outcome.message, "the starter runs").toBe("");
    expect((await checkSqlTask(db, task, task.starter)).feedback.ok, "the starter doesn't already pass").toBe(false);
    const solved = await checkSqlTask(db, task, task.solution);
    expect(solved.feedback, "the solution passes its own check").toEqual({ ok: true });
    if (task.ordered && (task.kind ?? "read") === "read") {
      expect(task.answer ?? task.solution, "an ordered task's answer sorts").toMatch(/ORDER\s+BY/i);
      expect(await sortTies(db, task.answer ?? task.solution), "an ordered task's answer sorts to one order only").toBe(0);
    }
    if ((task.kind ?? "read") !== "define") {
      const replay = await buildReplay(db, task.solution);
      expect(replay.supported ? "" : replay.reason, "the solution can be replayed").toBe("");
    }
  }, 20000);
});
