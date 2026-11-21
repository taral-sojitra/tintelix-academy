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
    expect(open.map((l) => l.id)).toEqual(["latency-percentiles", "queueing", "availability", "estimation", "vertical-horizontal-scaling", "load-balancing", "proxies", "health-checks", "stateless-services", "caching", "cdn", "sql-vs-nosql", "indexing", "replication", "sharding", "consistent-hashing", "bloom-filters", "object-storage", "cap-theorem", "consistency-models", "distributed-transactions", "message-queues"]);
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

  it("lists lesson 7, Who speaks for whom?", () => {
    expect(lessonSummaries("system-design")[6]).toMatchObject({ id: "proxies", order: 7, available: true, title: "Who speaks for whom?" });
  });

  it("lists lesson 8, Is anyone still there?", () => {
    expect(lessonSummaries("system-design")[7]).toMatchObject({ id: "health-checks", order: 8, available: true, title: "Is anyone still there?" });
  });

  it("lists lesson 9, Where does my login live?", () => {
    expect(lessonSummaries("system-design")[8]).toMatchObject({ id: "stateless-services", order: 9, available: true, title: "Where does my login live?" });
  });

  it("lists lesson 12, Tables or documents?", () => {
    expect(lessonSummaries("system-design")[11]).toMatchObject({ id: "sql-vs-nosql", order: 12, available: true, title: "Tables or documents?" });
  });

  it("lists lesson 13, Stop reading every row", () => {
    expect(lessonSummaries("system-design")[12]).toMatchObject({ id: "indexing", order: 13, available: true, title: "Stop reading every row" });
  });

  it("lists lesson 14, Copies that fall behind", () => {
    expect(lessonSummaries("system-design")[13]).toMatchObject({ id: "replication", order: 14, available: true, title: "Copies that fall behind" });
  });

  it("lists lesson 15, Too big for one database", () => {
    expect(lessonSummaries("system-design")[14]).toMatchObject({ id: "sharding", order: 15, available: true, title: "Too big for one database" });
  });

  it("lists lesson 16, Add a server, move few keys", () => {
    expect(lessonSummaries("system-design")[15]).toMatchObject({ id: "consistent-hashing", order: 16, available: true, title: "Add a server, move few keys" });
  });

  it("lists lesson 17, Definitely not here", () => {
    expect(lessonSummaries("system-design")[16]).toMatchObject({ id: "bloom-filters", order: 17, available: true, title: "Definitely not here" });
  });

  it("lists lesson 18, Let uploads skip your servers", () => {
    expect(lessonSummaries("system-design")[17]).toMatchObject({ id: "object-storage", order: 18, available: true, title: "Let uploads skip your servers" });
  });

  it("lists lesson 19, When the network splits", () => {
    expect(lessonSummaries("system-design")[18]).toMatchObject({ id: "cap-theorem", order: 19, available: true, title: "When the network splits" });
  });

  it("lists lesson 20, How current is this read?", () => {
    expect(lessonSummaries("system-design")[19]).toMatchObject({ id: "consistency-models", order: 20, available: true, title: "How current is this read?" });
  });

  it("lists lesson 21, One order, three services", () => {
    expect(lessonSummaries("system-design")[20]).toMatchObject({ id: "distributed-transactions", order: 21, available: true, title: "One order, three services" });
  });

  it("lists lesson 22, Absorb the spike", () => {
    expect(lessonSummaries("system-design")[21]).toMatchObject({ id: "message-queues", order: 22, available: true, title: "Absorb the spike" });
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
