"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { dsaCode, getDsaLesson } from "@tintelix/content";
import { parseListing, runCounts, stepSlice, trace, type Slice } from "@tintelix/dsa";
import { createStructureScene, type StructureScene } from "@tintelix/stage";
import type { Frame } from "@tintelix/schema";
import { getStore } from "../store";
import { Icon } from "../Icon";
import { CodePanel, type Lang } from "./CodePanel";
import { DsaNarrative, DsaTrack } from "./DsaNarrative";
import { InputPanel } from "./InputPanel";
import { PatternCard } from "./PatternCard";
import { PracticeList } from "./PracticeList";
import { PredictCard } from "./PredictCard";

const FRAME_MS = 700;
const SPEEDS = [0.5, 1, 1.5, 2] as const;

/** What the stage plays: the step's own example, or a preset or custom input the learner picked. */
type Source = { kind: "step" } | { kind: "other"; input: Record<string, unknown>; label: string; preset: string | null };

/** A DSA lesson: the structure scene, the code with its running line lit, steps, predictions and inputs (LLD §12). */
export function DsaLessonView({ slug }: { slug: string }) {
  const lesson = getDsaLesson(slug)!;
  const code = dsaCode[slug]!;
  const steps = lesson.steps;
  const [stepIndex, setStepIndex] = useState(0);
  const [source, setSource] = useState<Source>({ kind: "step" });
  const [frameIndex, setFrameIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState<number>(1);
  const [lang, setLang] = useState<Lang>("ts");
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [ticks, setTicks] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<StructureScene | null>(null);

  const step = steps[stepIndex]!;
  const runName = step.run ?? Object.keys(lesson.runs)[0]!;
  const run = lesson.runs[runName]!;
  const preset = lesson.presets.find((p) => p.id === step.preset) ?? lesson.presets[0]!;
  const input = source.kind === "other" ? source.input : preset.input;
  const traced = useMemo(() => trace(code.algos[run.algo]!, input), [code, run.algo, input]);
  const frames = traced.frames;
  const slice: Slice = useMemo(() => {
    const whole = { start: 0, end: Math.max(frames.length - 1, 0), predictAt: null };
    if (source.kind === "other") return whole;
    const s = stepSlice(frames, step);
    return "error" in s ? whole : s;
  }, [frames, step, source.kind]);
  const pending = step.predict !== undefined && source.kind === "step" && answers[step.id] === undefined && slice.predictAt !== null;
  const stopAt = pending ? slice.predictAt! : slice.end;
  const frame = frames[Math.min(frameIndex, frames.length - 1)];
  const asking = pending && frameIndex === slice.predictAt;
  const outputs = useMemo(() => runCounts(lesson, preset.id, code.algos), [lesson, preset.id, code.algos]);
  const listing = useMemo(() => parseListing(code.listings[run.listing]![lang], lang), [code, run.listing, lang]);

  // Saved step, language, predictions and ticks, read once.
  useEffect(() => {
    const store = getStore();
    let cancelled = false;
    void Promise.all([
      store.getProgress(lesson.id),
      store.getPref<Lang>("dsa.lang", "ts"),
      store.getPref<Record<string, number>>(`dsa.predict.${lesson.id}`, {}),
      store.getPref<string[]>("dsa.leetcode", []),
    ]).then(([saved, l, a, t]) => {
      if (cancelled) return;
      const at = Math.min(saved?.lastStep ?? 0, steps.length - 1);
      setStepIndex(at);
      setLang(l === "py" ? "py" : "ts");
      setAnswers(a);
      setTicks(t);
      setReady(true);
      void store.saveStep(lesson.id, at, steps.length);
    });
    return () => {
      cancelled = true;
    };
  }, [lesson.id, steps.length]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const scene = createStructureScene(el);
    sceneRef.current = scene;
    return () => {
      scene.destroy();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (frame) sceneRef.current?.render(frame, { counter: lesson.counter });
  }, [frame, lesson.counter]);

  // A new step, preset or custom input starts at the slice's first frame and plays. This is set while
  // rendering, not in an effect, so the play loop never weighs the old step's frame against the new step's stop.
  const [shown, setShown] = useState<{ frames: Frame[]; start: number; end: number } | null>(null);
  if (!shown || shown.frames !== frames || shown.start !== slice.start || shown.end !== slice.end) {
    setShown({ frames, start: slice.start, end: slice.end });
    setFrameIndex(slice.start);
    setPlaying(true);
  }

  useEffect(() => {
    if (!playing || !ready) return;
    if (frameIndex >= stopAt) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setFrameIndex((i) => Math.min(i + 1, stopAt)), FRAME_MS / speed);
    return () => clearTimeout(t);
  }, [playing, ready, frameIndex, stopAt, speed]);

  const go = useCallback(
    (i: number) => {
      if (i < 0 || i >= steps.length) return;
      setSource({ kind: "step" });
      setStepIndex(i);
      void getStore().saveStep(lesson.id, i, steps.length);
    },
    [lesson.id, steps.length],
  );

  const pick = (i: number) => {
    const next = { ...answers, [step.id]: i };
    setAnswers(next);
    void getStore().setPref(`dsa.predict.${lesson.id}`, next);
    setFrameIndex((f) => Math.min(f + 1, slice.end));
    setPlaying(true);
  };
  const chooseLang = (l: Lang) => {
    setLang(l);
    void getStore().setPref("dsa.lang", l);
  };
  const toggleTick = (s: string) => {
    const next = ticks.includes(s) ? ticks.filter((x) => x !== s) : [...ticks, s];
    setTicks(next);
    void getStore().setPref("dsa.leetcode", next);
  };
  const frameStep = (by: number) => {
    setPlaying(false);
    setFrameIndex((f) => Math.max(slice.start, Math.min(f + by, stopAt)));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key === "ArrowRight" && !asking) go(stepIndex + 1);
      else if (e.key === "ArrowLeft") go(stepIndex - 1);
      else if (e.key === ",") frameStep(-1);
      else if (e.key === ".") frameStep(1);
      else if (e.key === " " && !asking) setPlaying((p) => !p);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const lit = frame ? (listing.sites[frame.site] ?? []) : [];
  const last = steps.length - 1;
  const atEnd = frameIndex >= stopAt;
  return (
    <div className="lesson-grid dsa">
      <div className="lesson-main">
        <div className="stage-wrap dsa-stage">
          <div ref={stageRef} className="dsa-scene" data-ready={ready ? "true" : undefined} data-frame={frameIndex} data-site={frame?.site} />
          {source.kind === "other" && (
            <div className="dsa-source">
              <span>
                Playing <b>{source.label}</b>
              </span>
              <button type="button" className="btn sm" onClick={() => setSource({ kind: "step" })}>
                <Icon name="arrowLeft" />
                Back to the example
              </button>
            </div>
          )}
        </div>
        <div className="dsa-bar">
          <button type="button" className="ctrl" onClick={() => frameStep(-1)} disabled={frameIndex <= slice.start} aria-label="One move back" title="One move back (,)">
            <Icon name="arrowLeft" />
          </button>
          <button
            type="button"
            className="ctrl primary"
            disabled={asking}
            onClick={() => {
              if (atEnd && !pending) setFrameIndex(slice.start);
              setPlaying(atEnd && !pending ? true : !playing);
            }}
            aria-label={playing ? "Pause" : atEnd && !pending ? "Replay" : "Play"}
            title="Play or pause (Space)"
          >
            <Icon name={playing ? "pause" : atEnd && !pending ? "replay" : "play"} />
          </button>
          <button type="button" className="ctrl" onClick={() => frameStep(1)} disabled={frameIndex >= stopAt} aria-label="One move forward" title="One move forward (.)">
            <Icon name="arrowRight" />
          </button>
          <button type="button" className="ctrl" onClick={() => setSpeed(SPEEDS[((SPEEDS as readonly number[]).indexOf(speed) + 1) % SPEEDS.length]!)} aria-label={`Playback speed ${speed}×`} title="Speed">
            {speed}×
          </button>
          <p className="dsa-note" aria-live="polite">
            {frame?.note}
            {traced.stopped && frameIndex === frames.length - 1 && <b> Stopped after {frames.length} moves: this would never finish.</b>}
          </p>
          <span className="dsa-move">
            Move {frameIndex - slice.start + 1} of {slice.end - slice.start + 1}
          </span>
        </div>
        <CodePanel listing={listing} lit={lit} lang={lang} onLang={chooseLang} />
        <DsaTrack steps={steps} current={stepIndex} onGo={go} />
      </div>
      <div className="lesson-right">
        <DsaNarrative step={step} index={stepIndex} total={steps.length} outputs={outputs} />
        {step.predict && source.kind === "step" && <PredictCard predict={step.predict} chosen={answers[step.id]} open={asking} onPick={pick} />}
        {step.compare && (
          <div className="dsa-compare">
            {step.compare.map((r) => (
              <p key={r}>
                <span>{lesson.runs[r]?.label}</span>
                <b>{outputs[`${r}Steps`]}</b>
              </p>
            ))}
          </div>
        )}
        {step.part === "spot" && lesson.card && <PatternCard card={lesson.card} />}
        {step.part === "practice" && <PracticeList practice={lesson.practice} done={ticks} onToggle={toggleTick} />}
        <div className="nav-btns">
          <button type="button" className="btn" onClick={() => go(stepIndex - 1)} disabled={stepIndex === 0}>
            <Icon name="arrowLeft" />
            Back
          </button>
          {stepIndex < last ? (
            <button type="button" className="btn primary" onClick={() => go(stepIndex + 1)} disabled={asking}>
              Next: {steps[stepIndex + 1]!.short}
              <Icon name="arrowRight" />
            </button>
          ) : (
            <Link className="btn primary" href={`/dsa/${slug}/cheatsheet`}>
              Open the cheatsheet
              <Icon name="sheet" />
            </Link>
          )}
        </div>
        <p className="hint">
          <kbd>←</kbd> <kbd>→</kbd> step · <kbd>,</kbd> <kbd>.</kbd> one move · <kbd>Space</kbd> play or pause
        </p>
        <InputPanel
          presets={lesson.presets}
          spec={lesson.input}
          active={source.kind === "other" ? source.preset : null}
          onPreset={(p) => setSource({ kind: "other", input: p.input, label: p.label, preset: p.id })}
          onCustom={(value) => setSource({ kind: "other", input: value, label: "your input", preset: null })}
        />
      </div>
    </div>
  );
}
