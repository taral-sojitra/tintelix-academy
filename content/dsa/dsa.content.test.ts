import { describe, expect, it } from "vitest";
import { MAX_TITLE } from "@tintelix/schema";
import { checkDsaLesson } from "@tintelix/dsa/check";
import { dsaCode, dsaLessons, getDsaLesson, lessonFacts, lessonSummaries } from "../index";
import { LEETCODE } from "./leetcode";
import { dsa } from "./subject";

const stubs = dsa.modules.flatMap((m) => m.lessons);
const registry = LEETCODE.map((p) => p.slug);

describe("DSA subject", () => {
  it("lists 24 lessons in 8 modules with short hook titles", () => {
    expect(dsa.modules).toHaveLength(8);
    expect(stubs).toHaveLength(24);
    for (const s of stubs) expect(s.title!.length, s.id).toBeLessThanOrEqual(MAX_TITLE);
    expect(stubs.every((s) => s.id === `dsa-${s.slug}`)).toBe(true);
  });

  it("builds every lesson only on lessons that come earlier", () => {
    stubs.forEach((s, i) => {
      for (const b of s.buildsOn) expect(stubs.findIndex((x) => x.id === b), `${s.id} builds on ${b}`).toBeGreaterThanOrEqual(0);
      for (const b of s.buildsOn) expect(stubs.findIndex((x) => x.id === b), `${s.id} builds on ${b}`).toBeLessThan(i);
    });
  });

  it("passes every check for every written lesson", () => {
    for (const lesson of dsaLessons) {
      const order = stubs.findIndex((s) => s.id === lesson.id) + 1;
      expect(order, lesson.id).toBeGreaterThan(0);
      const stub = stubs[order - 1]!;
      expect([lesson.slug, lesson.topic, lesson.title]).toEqual([stub.slug, stub.topic, stub.title]);
      expect(checkDsaLesson(lesson, dsaCode[lesson.slug]!, registry, order)).toEqual([]);
    }
  });

  it("has lesson 1 written and finds it", () => {
    expect(getDsaLesson("how-to-solve")?.id).toBe("dsa-how-to-solve");
    expect(lessonFacts("dsa", "how-to-solve")).toMatchObject({ topic: "How to solve a problem", unit: "step" });
    expect(lessonSummaries("dsa")[0]).toMatchObject({ id: "dsa-how-to-solve", order: 1, available: true, href: "/dsa/how-to-solve" });
    expect(lessonSummaries("dsa")[1]!.available).toBe(false);
  });

  it("keeps a registry entry for every problem a lesson links, with its evidence of being free", () => {
    for (const p of LEETCODE) expect(p.evidence.length, p.slug).toBeGreaterThan(0);
    expect(new Set(registry).size).toBe(registry.length);
  });
});
