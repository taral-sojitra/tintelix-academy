"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { LessonProgress } from "@tintelix/store";
import { getStore } from "./store";
import { Icon } from "./Icon";

export interface ContinueTarget {
  id: string;
  href: string;
  title: string;
  topic: string;
  subject: string;
  order: number;
  total: number;
  steps: number;
  minutes: number;
}

type Mode = "start" | "continue" | "finished";

/** Which lesson the card points at: one in progress, else the first not yet done, else the last one finished. */
function pick(lessons: ContinueTarget[], all: LessonProgress[]): { target: ContinueTarget; mode: Mode; step: number } {
  const mine = all.filter((p) => lessons.some((l) => l.id === p.lessonId));
  const byId = (id: string) => lessons.find((l) => l.id === id)!;
  const recent = [...mine].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const open = recent.find((p) => !p.done);
  if (open) return { target: byId(open.lessonId), mode: "continue", step: open.lastStep };
  const next = lessons.find((l) => !mine.some((p) => p.lessonId === l.id && p.done));
  if (next) return { target: next, mode: "start", step: 0 };
  const last = byId(recent[0]!.lessonId);
  return { target: last, mode: "finished", step: last.steps - 1 };
}

const EYEBROW: Record<Mode, string> = { start: "Start here", continue: "Continue", finished: "Finished" };
const ACTION: Record<Mode, string> = { start: "Start the lesson", continue: "Resume", finished: "Review the lesson" };

/** "Continue" for a lesson in progress, "Start here" for the next one, "Finished" once every lesson is done. */
export function ContinueCard({ lessons }: { lessons: ContinueTarget[] }) {
  const [all, setAll] = useState<LessonProgress[]>([]);
  useEffect(() => {
    let live = true;
    getStore()
      .allProgress()
      .then((list) => {
        if (live) setAll(list);
      });
    return () => {
      live = false;
    };
  }, [lessons]);

  const { target, mode, step } = pick(lessons, all);
  const started = mode !== "start";
  const left = Math.max(1, Math.round(target.minutes * (1 - step / target.steps)));
  const sub = mode === "finished" ? `all ${target.steps} steps done` : mode === "continue" ? `${left} minutes left` : `${target.minutes} minutes`;

  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-copy">
        <p className="hero-eyebrow">
          {EYEBROW[mode]} · {target.subject} · Lesson {target.order} of {target.total}
        </p>
        <h1 id="hero-title">{target.title}</h1>
        <p className="hero-sub">
          {target.topic} · {sub}
        </p>
        <div className="hero-actions">
          <Link className="btn primary lg" href={target.href}>
            <Icon name="play" />
            {ACTION[mode]}
          </Link>
          <span className="hero-steps" aria-label={`Step ${step + 1} of ${target.steps}`}>
            Step {step + 1} of {target.steps}
            <span className="pips" aria-hidden="true">
              {Array.from({ length: target.steps }, (_, i) => (
                <i key={i} className={i <= step && started ? "on" : ""} />
              ))}
            </span>
          </span>
        </div>
      </div>
      <ol className="hero-how" aria-label="How a lesson works">
        <li>
          <b>Watch it move.</b> Requests flow through a live system diagram.
        </li>
        <li>
          <b>Change it yourself.</b> Drag a setting and every number follows.
        </li>
        <li>
          <b>Keep the cheatsheet.</b> One page per lesson, with the numbers.
        </li>
      </ol>
    </section>
  );
}
