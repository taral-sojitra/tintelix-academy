"use client";

import { useEffect, useRef, useState } from "react";
import type { Replay } from "@tintelix/sql";
import { Icon } from "../Icon";
import { ResultTable } from "./ResultTable";

const STEP_MS = 1800;

/** The stage: the last run taken apart clause by clause, in the order Postgres works through it. */
export function ReplayStage({ replay, autoplay = true, waiting }: { replay: Replay | null; autoplay?: boolean; waiting?: string }) {
  const [at, setAt] = useState(0);
  const [playing, setPlaying] = useState(autoplay);
  const [shown, setShown] = useState(replay);

  // A new replay starts again from FROM (state adjusted during render, not in an effect).
  if (replay !== shown) {
    setShown(replay);
    setAt(0);
    setPlaying(autoplay);
  }

  const frames = replay?.supported ? replay.frames : [];
  const last = frames.length - 1;
  const frameRef = useRef<HTMLDivElement>(null);

  // WHERE and HAVING: bring the first row that passed into view, so the kept rows aren't hidden below the fold.
  useEffect(() => {
    const wrap = frameRef.current?.querySelector<HTMLElement>(".sql-table-wrap");
    const row = wrap?.querySelector<HTMLElement>("tr.m-pass");
    if (wrap) wrap.scrollTop = row ? Math.max(0, row.offsetTop - 36) : 0;
  }, [at, replay]);

  useEffect(() => {
    if (!playing || at >= last) return;
    const t = setTimeout(() => setAt((i) => Math.min(i + 1, last)), STEP_MS);
    return () => clearTimeout(t);
  }, [playing, at, last]);

  if (!replay || !replay.supported) {
    return (
      <section className="sql-stage empty" aria-label="Replay of your query">
        <p className="sql-stage-msg">{replay && !replay.supported ? replay.reason : (waiting ?? "Run a query to see it replayed here, clause by clause.")}</p>
      </section>
    );
  }

  const frame = frames[at]!;
  const go = (i: number) => {
    setPlaying(false);
    setAt(Math.max(0, Math.min(last, i)));
  };

  return (
    <section className="sql-stage" aria-label="Replay of your query">
      <div className="sql-stage-top">
        <ol className="sql-clauses" aria-label="Clauses, in the order Postgres runs them">
          {frames.map((f, i) => (
            <li key={i}>
              <button type="button" className={i === at ? "cur" : i < at ? "past" : ""} aria-current={i === at ? "step" : undefined} onClick={() => go(i)}>
                {f.label ?? f.clause}
              </button>
            </li>
          ))}
        </ol>
        <div className="sql-stage-ctrls">
          <button type="button" className="ctrl" aria-label="Previous clause" onClick={() => go(at - 1)} disabled={at === 0}>
            <Icon name="arrowLeft" />
          </button>
          <button
            type="button"
            className="ctrl primary"
            aria-label={playing && at < last ? "Pause replay" : "Play replay"}
            onClick={() => {
              if (at >= last) { setAt(0); setPlaying(true); } else setPlaying(!playing);
            }}
          >
            <Icon name={playing && at < last ? "pause" : at >= last ? "replay" : "play"} />
          </button>
          <button type="button" className="ctrl" aria-label="Next clause" onClick={() => go(at + 1)} disabled={at === last}>
            <Icon name="arrowRight" />
          </button>
        </div>
      </div>
      <p className="sql-note" aria-live="polite">
        {frame.note}
      </p>
      <div className="sql-frame" key={at} ref={frameRef}>
        <ResultTable columns={frame.columns} rows={frame.rows} total={frame.total} marks={frame.marks} groups={frame.groups} max={60} caption={`Rows after ${frame.label ?? frame.clause}`} />
      </div>
    </section>
  );
}
