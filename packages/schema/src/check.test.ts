import { checkContent, quotedOutputs, testCond, type Component, type Lesson, type Subject } from "./index";

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
      kind: "cache-aside",
      world: { w: 920, h: 540 },
      bounds: { x: 8, y: 62, w: 896, h: 422 },
      nodes: { db: { x: 20, y: 80, w: 100, h: 60, kind: "db", label: "Database", sub: "Postgres" } },
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
    modules: [{ title: "Speed", lessons: [{ id: "caching", slug: "caching", topic: "Caching", title: "Survive the flash sale", summary: "s", buildsOn: [] }] }],
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

  it("flags a quoted value in a control readout the model does not produce", () => {
    const lesson = makeLesson({ controls: { hitRate: { label: "Hit rate", min: 0, max: 1, readout: "{nope} reads" } } });
    expect(check(lesson)).toContain("caching/control hitRate quotes {nope}, which the model does not produce");
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

  it("rejects a sim mode the scene kind doesn't have", () => {
    const lesson = makeLesson();
    lesson.steps[0]!.sim = { mode: "stale", speed: 1 };
    expect(check(lesson)).toContain("caching/step drowning uses sim mode stale, which a cache-aside scene doesn't have");
  });

  it("rejects a node outside the scene bounds", () => {
    const lesson = makeLesson();
    lesson.scene.nodes.db!.x = -50;
    expect(check(lesson)).toContain("caching: node db lies outside the scene bounds");
  });

  it("rejects a step that names an unknown node", () => {
    const lesson = makeLesson();
    lesson.steps[1]!.scene = { add: ["nope"] };
    expect(check(lesson)).toContain("caching/step fix names unknown node nope");
  });

  it("rejects a step that sets something that is not a model input", () => {
    const lesson = makeLesson();
    lesson.steps[0]!.model = { hitRat: 0.5 };
    expect(check(lesson)).toContain("caching/step drowning sets hitRat, which is not a model input");
  });

  it("rejects a lesson that differs from its subject entry", () => {
    expect(check(makeLesson({ title: "Something else" }))).toContain('caching: title "Something else" differs from its subject entry "Survive the flash sale"');
    expect(check(makeLesson({ topic: "Caches" }))).toContain('caching: topic "Caches" differs from its subject entry "Caching"');
  });
});

describe("board scenes", () => {
  const boardModel = {
    defaults: { mode: 0, load: 100 },
    run: ({ mode = 0, load = 0 }: Record<string, number>) => ({ mode, dbBusyPct: load * (mode + 1), failPct: mode * 10 }),
  };
  const boardLesson = (board: Record<string, unknown> = {}, over: Partial<Lesson> = {}): Lesson =>
    makeLesson({
      model: boardModel,
      controls: {},
      steps: [{ id: "s", tag: "problem", title: "S", short: "S", text: ["Busy {dbBusyPct}."], model: { mode: 1 }, live: "LIVE" }],
      cheatsheet: [{ heading: "H", text: ["Busy {dbBusyPct}."] }],
      scene: {
        kind: "board",
        world: { w: 1000, h: 470 },
        bounds: { x: 8, y: 40, w: 984, h: 390 },
        nodes: {
          users: { x: 16, y: 190, w: 160, h: 80, kind: "users", label: "Users", sub: "clicking" },
          app: { x: 300, y: 190, w: 160, h: 80, kind: "app", label: "App", sub: "serves" },
          db: { x: 600, y: 190, w: 160, h: 80, kind: "db", label: "Database", sub: "stores" },
        },
        wires: { u_a: { from: [176, 230], to: [300, 230] }, a_d: { from: [460, 230], to: [600, 230] } },
        board: {
          legend: [["cyan", "request"]],
          flows: { read: { path: [{ wire: "u_a", dir: 1, at: "app" }, { wire: "a_d", dir: 1, at: "db" }], color: "cyan", back: "green", fail: { at: "db", share: "failPct" } } },
          modes: [
            { flows: [{ flow: "read", weight: 1 }], tiles: [{ id: "a", label: "DB busy", icon: "db", hue: "cyan", value: "{dbBusyPct}", note: "" }] },
            { flows: [{ flow: "read", weight: 1 }], tiles: [{ id: "a", label: "DB busy", icon: "db", hue: "cyan", value: "{dbBusyPct}", note: "fails {failPct}" }] },
          ],
          ...board,
        },
      } as Lesson["scene"],
      ...over,
    });

  it("a valid board passes", () => {
    expect(check(boardLesson())).toEqual([]);
  });
  it("a board scene without a board is reported", () => {
    const lesson = boardLesson();
    delete (lesson.scene as { board?: unknown }).board;
    expect(check(lesson)).toContain("caching: scene kind board needs scene.board");
  });
  it("a flow that names an unknown wire is reported", () => {
    const problems = check(boardLesson({ flows: { read: { path: [{ wire: "nope", dir: 1, at: "app" }], color: "cyan" } } }));
    expect(problems).toContain("caching: board flow read uses unknown wire nope");
  });
  it("a flow that reaches an unknown node is reported", () => {
    const problems = check(boardLesson({ flows: { read: { path: [{ wire: "u_a", dir: 1, at: "ghost" }], color: "cyan" } } }));
    expect(problems).toContain("caching: board flow read reaches unknown node ghost");
  });
  it("a failure share must be a Pct output", () => {
    const problems = check(boardLesson({ flows: { read: { path: [{ wire: "u_a", dir: 1, at: "app" }], color: "cyan", fail: { at: "app", share: "dbBusy" } } } }));
    expect(problems).toContain("caching: board flow read fail share dbBusy must be a …Pct output");
  });
  it("a step whose mode has no board mode is reported", () => {
    const lesson = boardLesson();
    lesson.steps[0]!.model = { mode: 3 };
    expect(check(lesson)).toContain("caching/step s sets mode 3; the board has 2 modes");
  });
  it("a board template quoting a missing output is reported", () => {
    const problems = check(boardLesson({ modes: [{ flows: [], tiles: [{ id: "a", label: "X", icon: "db", hue: "cyan", value: "{nope}", note: "" }] }] }));
    expect(problems).toContain("caching: board mode 0 quotes {nope}, which the model does not produce");
  });
});

describe("testCond", () => {
  it("compares an output with above and below", () => {
    expect(testCond({ output: "x", above: 1 }, { x: 2 })).toBe(true);
    expect(testCond({ output: "x", above: 1 }, { x: 1 })).toBe(false);
    expect(testCond({ output: "x", below: 1 }, { x: 0 })).toBe(true);
    expect(testCond({ output: "missing", above: 0 }, {})).toBe(false);
  });
});
