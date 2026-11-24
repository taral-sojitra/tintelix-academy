"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { getSqlLesson } from "@tintelix/content";
import type { Checked, Replay } from "@tintelix/sql";
import { getStore } from "../store";
import { Icon } from "../Icon";
import { SqlClient } from "./client";
import { DatasetCard } from "./DatasetCard";
import { FeedbackCard } from "./FeedbackCard";
import { Md } from "./Md";
import { QueryEditor } from "./QueryEditor";
import { ReplayStage } from "./Replay";
import { ResultTable } from "./ResultTable";

function status(checked: Checked | null, busy: boolean, booted: boolean): string {
  if (busy) return booted ? "Running…" : "Starting Postgres in your browser…";
  if (!checked) return booted ? "Postgres is ready · runs in your browser" : "Starting Postgres in your browser…";
  const run = checked.run;
  if (!run.ok) return "Didn't run · runs in your browser";
  const ms = run.ms < 1 ? "under 1 ms" : `${Math.round(run.ms)} ms`;
  const rows = run.result.columns.length
    ? `${run.rowCount} ${run.rowCount === 1 ? "row" : "rows"}`
    : `${run.command} · ${run.rowCount} ${run.rowCount === 1 ? "row" : "rows"} changed`;
  return `${rows} · ${ms} · runs in your browser`;
}

/** A SQL task lesson: explanation and tasks, the replay and editor, then feedback, result and dataset. */
export function SqlLessonView({ slug }: { slug: string }) {
  const lesson = getSqlLesson(slug)!;
  const prefKey = `sql-tasks:${lesson.id}`;
  const client = useRef<SqlClient | null>(null);
  const [current, setCurrent] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [solved, setSolved] = useState<string[]>([]);
  const [ran, setRan] = useState<string[]>([]);
  const [checked, setChecked] = useState<Checked | null>(null);
  const [replay, setReplay] = useState<Replay | null>(null);
  const [busy, setBusy] = useState(true);
  const [booted, setBooted] = useState(false);
  const [help, setHelp] = useState<{ hint: boolean; solution: boolean }>({ hint: false, solution: false });

  const task = lesson.tasks[current]!;
  const draft = drafts[task.id] ?? task.starter;
  const setDraft = useCallback((sql: string) => setDrafts((d) => ({ ...d, [task.id]: sql })), [task.id]);

  /** Replays a query that already ran, or says why there's nothing to replay. */
  const replayOf = useCallback(async (sql: string, ok: boolean) => {
    if (!ok) return setReplay({ supported: false, reason: "Your query didn't run, so there's nothing to replay. The message on the right says why." });
    setReplay(await client.current!.replay(sql));
  }, []);

  // One worker per page; replay the first task's starter so the stage isn't empty.
  useEffect(() => {
    const c = new SqlClient(() => new Worker(new URL("./sql.worker.ts", import.meta.url), { type: "module" }));
    client.current = c;
    let live = true;
    const store = getStore();
    void (async () => {
      const done = await store.getPref<string[]>(prefKey, []);
      if (!live) return;
      const first = Math.max(0, lesson.tasks.findIndex((t) => !done.includes(t.id)));
      setSolved(done);
      setCurrent(first);
      if (!(await store.getProgress(lesson.id))) void store.saveStep(lesson.id, 0, lesson.tasks.length);
      const t = lesson.tasks[first]!;
      const r = await c.replay(t.starter);
      if (!live) return;
      setReplay(r);
      setBooted(true);
      setBusy(false);
    })();
    return () => {
      live = false;
      c.dispose();
    };
  }, [lesson, prefKey]);

  const run = useCallback(async () => {
    const c = client.current;
    if (!c || busy) return;
    setBusy(true);
    const result = await c.check(task, draft);
    setBooted(true);
    setChecked(result);
    setRan((r) => (r.includes(task.id) ? r : [...r, task.id]));
    if (result.feedback.ok && !solved.includes(task.id)) {
      const next = [...solved, task.id];
      setSolved(next);
      const store = getStore();
      void store.setPref(prefKey, next);
      void store.saveStep(lesson.id, next.length - 1, lesson.tasks.length);
    }
    await replayOf(draft, result.run.ok);
    setBusy(false);
  }, [busy, draft, lesson, prefKey, replayOf, solved, task]);

  const pick = useCallback(
    async (i: number) => {
      if (i === current) return;
      const t = lesson.tasks[i]!;
      setCurrent(i);
      setChecked(null);
      setHelp({ hint: false, solution: false });
      if (client.current && !busy) {
        setBusy(true);
        await replayOf(drafts[t.id] ?? t.starter, true);
        setBusy(false);
      }
    },
    [busy, current, drafts, lesson, replayOf],
  );

  const nextOpen = lesson.tasks.findIndex((t, i) => i > current && !solved.includes(t.id));
  const nextIndex = nextOpen >= 0 ? nextOpen : current + 1 < lesson.tasks.length ? current + 1 : -1;
  const result = checked?.run.ok ? checked.run : null;

  return (
    <div className="sql-grid">
      <div className="sql-learn">
        <section className="sql-explain">
          {lesson.explain.map((p, i) => (
            <p key={i}>
              <Md text={p} />
            </p>
          ))}
        </section>
        <section className="sql-syntax" aria-labelledby="syntax-title">
          <h3 id="syntax-title" className="eyebrow">
            Syntax
          </h3>
          <pre>
            <code>{lesson.syntax.code}</code>
          </pre>
          <ul>
            {lesson.syntax.notes.map((n, i) => (
              <li key={i}>
                <Md text={n} />
              </li>
            ))}
          </ul>
        </section>
        <section className="sql-tasks" aria-labelledby="tasks-title">
          <h3 id="tasks-title">
            Tasks
            <small>
              {solved.length} of {lesson.tasks.length} solved
            </small>
          </h3>
          <ol>
            {lesson.tasks.map((t, i) => {
              const done = solved.includes(t.id);
              return (
                <li key={t.id} className={`${i === current ? "cur" : ""}${done ? " done" : ""}`}>
                  <button type="button" onClick={() => void pick(i)} aria-current={i === current ? "step" : undefined}>
                    <span className="tk-no" aria-label={done ? "Solved" : undefined}>
                      {done ? <Icon name="check" /> : i + 1}
                    </span>
                    <span className="tk-text">
                      <Md text={t.prompt} />
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </section>
        <aside className="note n-watch">
          <Icon name="alert" />
          <div>
            <span className="eyebrow">Common mistake</span>
            <Md text={lesson.mistake} />
          </div>
        </aside>
      </div>

      <div className="sql-work">
        <div className="sql-now">
          <span className="eyebrow">
            Task {current + 1} of {lesson.tasks.length}
          </span>
          <p>
            <Md text={task.prompt} />
          </p>
          <div className="tk-help">
            <div className="tk-btns">
              <button type="button" className="btn sm" aria-expanded={help.hint} onClick={() => setHelp((h) => ({ ...h, hint: !h.hint }))}>
                <Icon name="bulb" />
                Hint
              </button>
              <button
                type="button"
                className="btn sm"
                aria-expanded={help.solution}
                disabled={!ran.includes(task.id) && !solved.includes(task.id)}
                title={!ran.includes(task.id) && !solved.includes(task.id) ? "Run the query once first" : undefined}
                onClick={() => setHelp((h) => ({ ...h, solution: !h.solution }))}
              >
                <Icon name="sheet" />
                Show solution
              </button>
            </div>
            {help.hint && (
              <p className="tk-hint">
                <Md text={task.hint} />
              </p>
            )}
            {help.solution && (
              <div className="tk-sol">
                <pre>
                  <code>{task.solution}</code>
                </pre>
                <button type="button" className="btn sm" onClick={() => setDraft(task.solution)}>
                  Put it in the editor
                </button>
              </div>
            )}
          </div>
        </div>
        <ReplayStage replay={replay} waiting={booted ? undefined : "Starting Postgres in your browser…"} />
        <p className="sql-status" role="status">
          {status(checked, busy, booted)}
        </p>
        <QueryEditor value={draft} onChange={setDraft} onRun={() => void run()} />
        <div className="sql-runbar">
          <button type="button" className="btn primary" onClick={() => void run()} disabled={busy}>
            <Icon name="play" />
            Run
          </button>
          <button type="button" className="btn ghost sm" onClick={() => setDraft(task.starter)} disabled={draft === task.starter}>
            <Icon name="replay" />
            Reset to the starter
          </button>
          <span className="hint">
            <kbd>Ctrl</kbd> + <kbd>Enter</kbd> runs
          </span>
        </div>
      </div>

      <div className="sql-check">
        <FeedbackCard
          feedback={checked?.feedback ?? null}
          onNext={nextIndex >= 0 ? () => void pick(nextIndex) : undefined}
        />
        <section className="sql-result" aria-labelledby="result-title">
          <h3 id="result-title">Result</h3>
          {!checked ? (
            <p className="sql-more">Your result shows here after a run.</p>
          ) : !result ? (
            <p className="sql-more">No result: the query didn't run.</p>
          ) : result.result.columns.length ? (
            <ResultTable
              columns={result.result.columns}
              rows={result.result.rows}
              ranks={checked.feedback.ok || checked.feedback.kind !== "order" ? undefined : checked.feedback.shouldBe}
              caption="Your result"
            />
          ) : (
            <p className="sql-more">
              {result.command} changed {result.rowCount} {result.rowCount === 1 ? "row" : "rows"}. Every run starts from a fresh shop.
            </p>
          )}
        </section>
        <DatasetCard />
        <div className="nav-btns">
          {nextIndex >= 0 ? (
            <button type="button" className="btn primary" onClick={() => void pick(nextIndex)}>
              Next task
              <Icon name="arrowRight" />
            </button>
          ) : (
            <Link className="btn primary" href={`/sql/${slug}/cheatsheet`}>
              Open the cheatsheet
              <Icon name="sheet" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
