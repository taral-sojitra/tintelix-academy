"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { components as allComponents, getLesson } from "@tintelix/content";
import type { Outputs } from "@tintelix/schema";
import { createPlayer, type Player, type Speed } from "@tintelix/stage";
import { getStore } from "../store";
import { Icon } from "../Icon";
import { StepNarrative } from "./StepNarrative";
import { StepTrack } from "./StepTrack";
import { TryIt } from "./TryIt";

const NEXT_SPEED: Record<Speed, Speed> = { 1: 2, 2: 0.5, 0.5: 1 };

interface View {
  stepIndex: number;
  playing: boolean;
  speed: Speed;
  outputs: Outputs;
  inputs: Record<string, number>;
  overridden: boolean;
}

/** The interactive part of a lesson page: stage, tiles, steps, narrative and controls. */
export function LessonPlayer({ subject, slug }: { subject: string; slug: string }) {
  const lesson = getLesson(subject, slug)!;
  const stageRef = useRef<HTMLDivElement>(null);
  const hudRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Player | null>(null);
  const [view, setView] = useState<View>(() => {
    const inputs = { ...lesson.model.defaults, ...lesson.steps[0]!.model };
    return { stepIndex: 0, playing: true, speed: 1, outputs: lesson.model.run(inputs), inputs, overridden: false };
  });

  useEffect(() => {
    let cancelled = false;
    const store = getStore();
    let player: Player | null = null;
    const sync = () => {
      if (!player) return;
      const s = player.state;
      setView({ stepIndex: s.stepIndex, playing: s.playing, speed: s.speed, outputs: player.outputs(), inputs: { ...s.inputs }, overridden: Object.keys(s.overrides).length > 0 });
    };
    store.getProgress(lesson.id).then((saved) => {
      if (cancelled || !stageRef.current) return;
      player = createPlayer(lesson, stageRef.current, { startStep: saved?.lastStep ?? 0, hud: hudRef.current ?? undefined });
      playerRef.current = player;
      stageRef.current.dataset.ready = "true";
      player.on("step", () => {
        sync();
        void store.saveStep(lesson.id, player!.state.stepIndex, lesson.steps.length);
      });
      player.on("change", sync);
      player.on("play", sync);
      sync();
      void store.saveStep(lesson.id, player.state.stepIndex, lesson.steps.length);
    });
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (playerRef.current?.handleKey(e)) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelled = true;
      window.removeEventListener("keydown", onKey);
      player?.destroy();
      playerRef.current = null;
    };
  }, [lesson]);

  const go = useCallback((i: number) => playerRef.current?.go(i), []);
  const step = lesson.steps[view.stepIndex]!;
  const last = lesson.steps.length - 1;
  /** The first step that unlocks a control, so a locked panel can say when it opens. */
  const unlockAt = (name: string) => lesson.steps.findIndex((s) => (s.controls ?? []).includes(name));
  const components = lesson.components.map((id) => allComponents.find((c) => c.id === id)!).filter(Boolean);

  return (
    <div className="lesson-grid">
      <div className="lesson-main">
        <div ref={hudRef} className="tx-hud" aria-hidden="true" />
        <div className="stage-wrap">
          <div ref={stageRef} className="stage-host" role="img" aria-label={`Animated diagram: ${step.title}. The step text describes everything it shows.`} />
          <div className="stage-ctrls">
            <button type="button" className="ctrl" onClick={() => go(view.stepIndex)} aria-label="Replay this step" title="Replay (R)">
              <Icon name="replay" />
            </button>
            <button type="button" className="ctrl primary" onClick={() => playerRef.current?.setPlaying(!view.playing)} aria-label={view.playing ? "Pause" : "Play"} title="Pause (Space)">
              <Icon name={view.playing ? "pause" : "play"} />
            </button>
            <button type="button" className="ctrl" onClick={() => playerRef.current?.setSpeed(NEXT_SPEED[view.speed])} aria-label={`Playback speed ${view.speed}×`} title="Speed">
              {view.speed}×
            </button>
          </div>
        </div>
        <StepTrack steps={lesson.steps} current={view.stepIndex} onGo={go} />
      </div>
      <div className="lesson-right">
        <StepNarrative step={step} index={view.stepIndex} total={lesson.steps.length} outputs={view.outputs} />
        {Object.entries(lesson.controls).map(([name, control]) => (
          <TryIt
            key={name}
            name={name}
            control={control}
            value={view.inputs[name] ?? lesson.model.defaults[name] ?? control.min}
            enabled={(step.controls ?? []).includes(name)}
            lockedText={view.stepIndex < unlockAt(name) ? `Unlocks at step ${unlockAt(name) + 1}` : "Locked on this step, so the story plays out"}
            outputs={view.outputs}
            changed={view.overridden}
            onChange={(v) => playerRef.current?.setInput(name, v)}
            onReset={() => go(view.stepIndex)}
          />
        ))}
        <div className="nav-btns">
          <button type="button" className="btn" onClick={() => go(view.stepIndex - 1)} disabled={view.stepIndex === 0}>
            <Icon name="arrowLeft" />
            Back
          </button>
          {view.stepIndex < last ? (
            <button type="button" className="btn primary" onClick={() => go(view.stepIndex + 1)}>
              Next: {lesson.steps[view.stepIndex + 1]!.short}
              <Icon name="arrowRight" />
            </button>
          ) : (
            <Link className="btn primary" href={`/${subject}/${slug}/cheatsheet`}>
              Open the cheatsheet
              <Icon name="sheet" />
            </Link>
          )}
        </div>
        <p className="hint">
          <kbd>←</kbd> <kbd>→</kbd> step · <kbd>Space</kbd> pause · <kbd>R</kbd> replay
        </p>
        <section className="lesson-comps" aria-labelledby="lc-title">
          <h3 id="lc-title">
            <Icon name="blocks" />
            Components in this lesson
          </h3>
          <ul className="chips">
            {components.map((c) => (
              <li key={c.id}>
                <Link className="chip" href={`/components#${c.id}`}>
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
