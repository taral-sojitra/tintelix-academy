"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { openStore, type LessonProgress } from "@tintelix/store";
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

/** "Continue" when the learner has started a lesson on this device, otherwise "Start here". */
export function ContinueCard({ lessons }: { lessons: ContinueTarget[] }) {
  const [progress, setProgress] = useState<LessonProgress | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    openStore()
      .allProgress()
      .then((all) => {
        if (!live) return;
        const open = all.filter((p) => !p.done && lessons.some((l) => l.id === p.lessonId));
        open.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        setProgress(open[0] ?? null);
      });
    return () => {
      live = false;
    };
  }, [lessons]);

  const target = lessons.find((l) => l.id === progress?.lessonId) ?? lessons[0]!;
  const started = !!progress && progress.lessonId === target.id;
  const step = started ? progress!.lastStep : 0;
  const left = Math.max(1, Math.round(target.minutes * (1 - step / target.steps)));

  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-copy">
        <p className="hero-eyebrow">
          {started ? "Continue" : "Start here"} · {target.subject} · Lesson {target.order} of {target.total}
        </p>
        <h1 id="hero-title">{target.title}</h1>
        <p className="hero-sub">
          {target.topic} · {started ? `${left} minutes left` : `${target.minutes} minutes`}
        </p>
        <div className="hero-actions">
          <Link className="btn primary lg" href={target.href}>
            <Icon name="play" />
            {started ? "Resume" : "Start the lesson"}
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
