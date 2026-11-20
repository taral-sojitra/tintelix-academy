import { checkContent } from "@tintelix/schema";
import { components, getLesson, lessonSummaries, lessons, subjects } from "./index";

describe("content", () => {
  it("passes every content check", () => {
    expect(checkContent({ subjects, lessons, components })).toEqual([]);
  });

  it("lists 20 System Design lessons in 6 modules", () => {
    const sd = subjects.find((s) => s.id === "system-design")!;
    expect(sd.modules).toHaveLength(6);
    expect(sd.modules.flatMap((m) => m.lessons)).toHaveLength(20);
  });

  it("covers all seven subjects", () => {
    expect(subjects.map((s) => s.id).sort()).toEqual(["apis", "dsa", "linux", "microservices", "networks", "sql", "system-design"]);
  });

  it("finds Caching by subject and slug", () => {
    expect(getLesson("system-design", "caching")?.title).toBe("Survive the flash sale");
  });

  it("returns undefined for an unknown slug", () => {
    expect(getLesson("system-design", "nope")).toBeUndefined();
  });

  it("marks Caching and CDN as available, in teaching order", () => {
    const open = lessonSummaries("system-design").filter((l) => l.available);
    expect(open.map((l) => l.id)).toEqual(["caching", "cdn"]);
    expect(lessonSummaries("system-design").find((l) => l.id === "caching")).toMatchObject({ module: "Speed", order: 5 });
  });

  it("lists the CDN lesson as written and in order", () => {
    expect(lessonSummaries("system-design").find((l) => l.id === "cdn")).toMatchObject({ module: "Speed", order: 6, available: true });
    expect(getLesson("system-design", "cdn")?.title).toBe("Serve Mumbai from Mumbai");
  });

  it("every step's model values keep the hit rate between 0 and 1", () => {
    for (const step of getLesson("system-design", "caching")!.steps) {
      const h = step.model?.hitRate;
      if (h === undefined) continue;
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThanOrEqual(1);
    }
  });
});
