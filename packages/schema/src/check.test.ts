import { checkContent, quotedOutputs, type Component, type Lesson, type Subject } from "./index";

const model = {
  defaults: { traffic: 6000, hitRate: 0.5 },
  run: ({ traffic = 0, hitRate = 0 }: Record<string, number>) => ({ dbReads: traffic * (1 - hitRate) }),
};

function makeLesson(over: Partial<Lesson> = {}): Lesson {
  return {
    id: "caching",
    home: "system-design",
    slug: "caching",
    topic: "Caching",
    title: "Survive the flash sale",
    promise: "Keep the database alive when traffic spikes.",
    minutes: 8,
    level: 1,
    scene: {
      world: { w: 920, h: 540 },
      bounds: { x: 8, y: 62, w: 896, h: 422 },
      nodes: { db: { x: 0, y: 0, w: 100, h: 60, kind: "db", label: "Database", sub: "Postgres" } },
      wires: { a_d: { from: [0, 0], to: [10, 10] } },
    },
    model,
    controls: { hitRate: { label: "Hit rate", min: 0, max: 1, step: 0.01, unit: "%" } },
    steps: [
      { id: "drowning", tag: "problem", title: "The database is drowning", short: "Drowning", text: ["Reads hit {dbReads} a second."], live: "LIVE" },
      { id: "fix", tag: "solution", title: "Add a cache", short: "Fix", text: ["Better."], controls: ["hitRate"], live: "LIVE" },
    ],
    components: ["database"],
    buildsOn: [],
    questions: [],
    cheatsheet: [{ heading: "Numbers", text: ["Reads: {dbReads}."] }],
    ...over,
  };
}

const subjects: Subject[] = [
  {
    id: "system-design",
    title: "System Design",
    blurb: "How big systems stay fast.",
    modules: [{ title: "Speed", lessons: [{ id: "caching", slug: "caching", topic: "Caching", summary: "s", buildsOn: [] }] }],
  },
];
const components: Component[] = [
  { id: "database", name: "Database", icon: "db", category: "storage", oneLine: "Stores data.", useWhen: ["Always"], watchOut: ["Load"], numbers: [], tools: ["Postgres"] },
];
const check = (lesson: Lesson) => checkContent({ subjects, lessons: [lesson], components });

describe("quotedOutputs", () => {
  it("returns the names inside braces, in order", () => {
    expect(quotedOutputs("Reads fall to {dbReads} at {p95} ms")).toEqual(["dbReads", "p95"]);
  });
});

describe("checkContent", () => {
  it("accepts valid content", () => {
    expect(check(makeLesson())).toEqual([]);
  });

  it("flags a quoted value the model does not produce", () => {
    const lesson = makeLesson();
    lesson.steps[0]!.text = ["Look at {nope}."];
    expect(check(lesson)).toContain("caching/step drowning quotes {nope}, which the model does not produce");
  });

  it("flags a quoted value in a changed line the model does not produce", () => {
    const lesson = makeLesson();
    lesson.steps[1]!.changed = [{ kind: "mod", label: "Load", value: "{nope}" }];
    expect(check(lesson)).toContain("caching/step fix quotes {nope}, which the model does not produce");
  });

  it("flags a quoted value in the cheatsheet the model does not produce", () => {
    expect(check(makeLesson({ cheatsheet: [{ heading: "N", text: ["{nope}"] }] }))).toContain(
      "caching/cheatsheet quotes {nope}, which the model does not produce",
    );
  });

  it("flags a hook title over 40 characters", () => {
    const problems = check(makeLesson({ title: "A hook title that is far too long to fit on a card" }));
    expect(problems.some((p) => p.includes("over 40 characters"))).toBe(true);
  });

  it("flags a missing component", () => {
    expect(check(makeLesson({ components: ["database", "queue"] }))).toContain("caching: unknown component queue");
  });

  it("flags a step that unlocks a control the lesson does not define", () => {
    const lesson = makeLesson();
    lesson.steps[1]!.controls = ["speed"];
    expect(check(lesson)).toContain("caching/step fix unlocks unknown control speed");
  });

  it("flags duplicate step ids", () => {
    const lesson = makeLesson();
    lesson.steps[1]!.id = "drowning";
    expect(check(lesson)).toContain("caching: duplicate step id drowning");
  });

  it("flags a lesson its home subject does not list", () => {
    expect(check(makeLesson({ id: "cdn", slug: "cdn" }))).toContain("cdn: not listed in subject system-design");
  });

  it("flags buildsOn entries that name no lesson", () => {
    expect(check(makeLesson({ buildsOn: ["ghost"] }))).toContain("caching: builds on unknown lesson ghost");
  });

  it("reports schema problems with their path", () => {
    const problems = check(makeLesson({ minutes: -1 }));
    expect(problems.some((p) => p.startsWith("caching: minutes"))).toBe(true);
  });
});
