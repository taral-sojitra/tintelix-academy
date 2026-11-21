import { checkContent } from "@tintelix/schema";
import { components, getLesson, lessonSummaries, lessons, subjects } from "./index";

describe("content", () => {
  it("passes every content check", () => {
    expect(checkContent({ subjects, lessons, components })).toEqual([]);
  });

  it("lists 30 System Design lessons in 8 modules, opening with Measuring systems and closing with Staying up", () => {
    const sd = subjects.find((s) => s.id === "system-design")!;
    expect(sd.modules.map((m) => m.title)).toEqual([
      "Measuring systems",
      "Scaling out",
      "Speed",
      "Data storage",
      "Consistency",
      "Messaging and reliability",
      "Services",
      "Staying up",
    ]);
    expect(sd.modules.flatMap((m) => m.lessons)).toHaveLength(30);
  });

  it("only builds on lessons that come earlier", () => {
    const order = lessonSummaries("system-design").map((l) => l.id);
    const sd = subjects.find((s) => s.id === "system-design")!;
    for (const stub of sd.modules.flatMap((m) => m.lessons)) {
      for (const b of stub.buildsOn) expect(order.indexOf(b), `${stub.id} builds on ${b}`).toBeLessThan(order.indexOf(stub.id));
    }
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

  it("marks the built lessons as available, in teaching order", () => {
    const open = lessonSummaries("system-design").filter((l) => l.available);
    expect(open.map((l) => l.id)).toEqual(["latency-percentiles", "queueing", "availability", "estimation", "vertical-horizontal-scaling", "load-balancing", "caching", "cdn"]);
    expect(lessonSummaries("system-design").find((l) => l.id === "caching")).toMatchObject({ module: "Speed", order: 10 });
  });

  it("opens the subject on lesson 1, The average is lying", () => {
    expect(lessonSummaries("system-design")[0]).toMatchObject({ id: "latency-percentiles", module: "Measuring systems", order: 1, available: true, title: "The average is lying" });
    expect(getLesson("system-design", "latency-percentiles")?.title).toBe("The average is lying");
  });

  it("lists lesson 2, Busy, then suddenly slow", () => {
    expect(lessonSummaries("system-design")[1]).toMatchObject({ id: "queueing", module: "Measuring systems", order: 2, available: true, title: "Busy, then suddenly slow" });
  });

  it("lists lesson 3, Nobody broke their promise", () => {
    expect(lessonSummaries("system-design")[2]).toMatchObject({ id: "availability", order: 3, available: true, title: "Nobody broke their promise" });
  });

  it("lists lesson 4, From users to servers", () => {
    expect(lessonSummaries("system-design")[3]).toMatchObject({ id: "estimation", order: 4, available: true, title: "From users to servers" });
  });

  it("lists lesson 5, Bigger box or more boxes?", () => {
    expect(lessonSummaries("system-design")[4]).toMatchObject({ id: "vertical-horizontal-scaling", order: 5, available: true, title: "Bigger box or more boxes?" });
  });

  it("lists lesson 6, Who gets the next request?", () => {
    expect(lessonSummaries("system-design")[5]).toMatchObject({ id: "load-balancing", order: 6, available: true, title: "Who gets the next request?" });
  });

  it("lists the CDN lesson as written and in order", () => {
    expect(lessonSummaries("system-design").find((l) => l.id === "cdn")).toMatchObject({ module: "Speed", order: 11, available: true });
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

  it("the CDN slow-motion step has misses a learner can see", () => {
    const cdn = getLesson("system-design", "cdn")!;
    const slow = cdn.steps.find((s) => s.id === "slow-mo")!;
    const out = cdn.model.run({ ...cdn.model.defaults, ...slow.model });
    expect(out.edgeHitPct).toBeLessThan(95);
    expect(out.edgeHitPct).toBeGreaterThan(80);
    expect(slow.text.join(" ")).toContain("{edgeHitPct}");
  });
});
