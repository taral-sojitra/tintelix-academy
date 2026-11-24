import { checkContent } from "@tintelix/schema";
import { components, getLesson, lessonFacts, lessonSummaries, lessons, subjects } from "./index";

describe("content", () => {
  it("passes every content check", () => {
    expect(checkContent({ subjects, lessons, components })).toEqual([]);
  });

  it("lists 59 System Design lessons in 13 modules: eight of concepts, then five of case studies", () => {
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
      "Case studies: the method and the classics",
      "Case studies: social and real time",
      "Case studies: media and files",
      "Case studies: data pipelines",
      "Case studies: money and orders",
    ]);
    expect(sd.modules.flatMap((m) => m.lessons)).toHaveLength(59);
    expect(sd.modules[8]!.lessons.slice(0, 2).map((l) => l.id)).toEqual(["design-method", "url-shortener"]);
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

  it("gives the facts a lesson card needs for either kind of lesson", () => {
    expect(lessonFacts("system-design", "caching")).toMatchObject({ title: "Survive the flash sale", unit: "step", steps: getLesson("system-design", "caching")!.steps.length });
    expect(lessonFacts("sql", "select")).toMatchObject({ title: "Pick the columns you need", topic: "SELECT", unit: "task", steps: 4 });
    expect(lessonFacts("sql", "nope")).toBeUndefined();
  });

  it("returns undefined for an unknown slug", () => {
    expect(getLesson("system-design", "nope")).toBeUndefined();
  });

  it("marks the built lessons as available, in teaching order", () => {
    const open = lessonSummaries("system-design").filter((l) => l.available);
    expect(open.map((l) => l.id)).toEqual(["latency-percentiles", "queueing", "availability", "estimation", "vertical-horizontal-scaling", "load-balancing", "proxies", "health-checks", "stateless-services", "caching", "cdn", "sql-vs-nosql", "indexing", "replication", "sharding", "consistent-hashing", "bloom-filters", "object-storage", "cap-theorem", "consistency-models", "distributed-transactions", "message-queues", "idempotency", "rate-limiting", "fan-out", "api-gateway", "monolith-vs-microservices", "retries-and-circuit-breakers", "leader-election", "multi-region", "design-method", "url-shortener", "unique-ids", "key-value-store", "distributed-rate-limiter", "web-crawler", "search-engine", "search-autocomplete", "notification-service", "photo-feed", "chat-app", "proximity-service", "nearby-friends", "ride-hailing", "maps-navigation", "video-streaming", "file-sync", "object-store-internals", "email-service", "message-queue-design", "metrics-alerting", "click-aggregation", "leaderboard", "rag-serving", "hotel-booking", "orders-inventory", "payment-system", "digital-wallet", "stock-exchange"]);
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

  it("lists lesson 23, Charged twice?", () => {
    expect(lessonSummaries("system-design")[22]).toMatchObject({ id: "idempotency", order: 23, available: true, title: "Charged twice?" });
  });

  it("lists lesson 24, One client floods the API", () => {
    expect(lessonSummaries("system-design")[23]).toMatchObject({ id: "rate-limiting", order: 24, available: true, title: "One client floods the API" });
  });

  it("lists lesson 25, A celebrity posts", () => {
    expect(lessonSummaries("system-design")[24]).toMatchObject({ id: "fan-out", order: 25, available: true, title: "A celebrity posts" });
  });

  it("lists lesson 26, One front door", () => {
    expect(lessonSummaries("system-design")[25]).toMatchObject({ id: "api-gateway", order: 26, available: true, title: "One front door" });
  });

  it("lists lesson 27, Split it, or keep it whole?", () => {
    expect(lessonSummaries("system-design")[26]).toMatchObject({ id: "monolith-vs-microservices", order: 27, available: true, title: "Split it, or keep it whole?" });
  });

  it("lists lesson 28, Don't kick a slow service", () => {
    expect(lessonSummaries("system-design")[27]).toMatchObject({ id: "retries-and-circuit-breakers", order: 28, available: true, title: "Don't kick a slow service" });
  });

  it("lists lesson 29, Who's in charge now?", () => {
    expect(lessonSummaries("system-design")[28]).toMatchObject({ id: "leader-election", order: 29, available: true, title: "Who's in charge now?" });
  });

  it("lists lesson 30, A whole region goes dark", () => {
    expect(lessonSummaries("system-design")[29]).toMatchObject({ id: "multi-region", order: 30, available: true, title: "A whole region goes dark" });
  });

  it("lists lesson 32, Turn a long link into seven characters", () => {
    expect(lessonSummaries("system-design")[31]).toMatchObject({ id: "url-shortener", module: "Case studies: the method and the classics", order: 32, available: true, title: "Turn a long link into seven characters" });
  });

  it("lists lesson 59, Match a buy and a sell in microseconds", () => {
    expect(lessonSummaries("system-design")[58]).toMatchObject({ id: "stock-exchange", order: 59, available: true, title: "Match a buy and a sell in microseconds" });
  });

  it("lists lesson 58, Move money between wallets safely", () => {
    expect(lessonSummaries("system-design")[57]).toMatchObject({ id: "digital-wallet", order: 58, available: true, title: "Move money between wallets safely" });
  });

  it("lists lesson 57, Take the money exactly once", () => {
    expect(lessonSummaries("system-design")[56]).toMatchObject({ id: "payment-system", order: 57, available: true, title: "Take the money exactly once" });
  });

  it("lists lesson 56, Sell only what's on the shelf", () => {
    expect(lessonSummaries("system-design")[55]).toMatchObject({ id: "orders-inventory", order: 56, available: true, title: "Sell only what's on the shelf" });
  });

  it("lists lesson 55, Never sell the same room twice", () => {
    expect(lessonSummaries("system-design")[54]).toMatchObject({ id: "hotel-booking", order: 55, available: true, title: "Never sell the same room twice" });
  });

  it("lists lesson 54, Answer from your own documents", () => {
    expect(lessonSummaries("system-design")[53]).toMatchObject({ id: "rag-serving", order: 54, available: true, title: "Answer from your own documents" });
  });

  it("lists lesson 53, Rank ten million players live", () => {
    expect(lessonSummaries("system-design")[52]).toMatchObject({ id: "leaderboard", order: 53, available: true, title: "Rank ten million players live" });
  });

  it("lists lesson 52, Count every click exactly once", () => {
    expect(lessonSummaries("system-design")[51]).toMatchObject({ id: "click-aggregation", order: 52, available: true, title: "Count every click exactly once" });
  });

  it("lists lesson 51, Spot the outage before users do", () => {
    expect(lessonSummaries("system-design")[50]).toMatchObject({ id: "metrics-alerting", order: 51, available: true, title: "Spot the outage before users do" });
  });

  it("lists lesson 50, A queue that keeps every message", () => {
    expect(lessonSummaries("system-design")[49]).toMatchObject({ id: "message-queue-design", order: 50, available: true, title: "A queue that keeps every message" });
  });

  it("lists lesson 49, An inbox for a billion people", () => {
    expect(lessonSummaries("system-design")[48]).toMatchObject({ id: "email-service", order: 49, available: true, title: "An inbox for a billion people" });
  });

  it("lists lesson 48, Store a trillion files, lose none", () => {
    expect(lessonSummaries("system-design")[47]).toMatchObject({ id: "object-store-internals", order: 48, available: true, title: "Store a trillion files, lose none" });
  });

  it("lists lesson 47, Edit on a laptop, see it on a phone", () => {
    expect(lessonSummaries("system-design")[46]).toMatchObject({ id: "file-sync", order: 47, available: true, title: "Edit on a laptop, see it on a phone" });
  });

  it("lists lesson 46, Upload once, play anywhere", () => {
    expect(lessonSummaries("system-design")[45]).toMatchObject({ id: "video-streaming", order: 46, available: true, title: "Upload once, play anywhere" });
  });

  it("lists lesson 45, The fastest way home", () => {
    expect(lessonSummaries("system-design")[44]).toMatchObject({ id: "maps-navigation", order: 45, available: true, title: "The fastest way home" });
  });

  it("lists lesson 44, A car for every rider in seconds", () => {
    expect(lessonSummaries("system-design")[43]).toMatchObject({ id: "ride-hailing", order: 44, available: true, title: "A car for every rider in seconds" });
  });

  it("lists lesson 43, Which friends are close right now?", () => {
    expect(lessonSummaries("system-design")[42]).toMatchObject({ id: "nearby-friends", order: 43, available: true, title: "Which friends are close right now?" });
  });

  it("lists lesson 42, Places within two kilometres", () => {
    expect(lessonSummaries("system-design")[41]).toMatchObject({ id: "proximity-service", order: 42, available: true, title: "Places within two kilometres" });
  });

  it("lists lesson 41, Delivered, read, and in order", () => {
    expect(lessonSummaries("system-design")[40]).toMatchObject({ id: "chat-app", order: 41, available: true, title: "Delivered, read, and in order" });
  });

  it("lists lesson 40, Fill the home feed in a blink", () => {
    expect(lessonSummaries("system-design")[39]).toMatchObject({ id: "photo-feed", order: 40, available: true, title: "Fill the home feed in a blink" });
  });

  it("lists lesson 39, A million alerts, none sent twice", () => {
    expect(lessonSummaries("system-design")[38]).toMatchObject({ id: "notification-service", module: "Case studies: social and real time", order: 39, available: true, title: "A million alerts, none sent twice" });
  });

  it("lists lesson 38, Guess the query after two letters", () => {
    expect(lessonSummaries("system-design")[37]).toMatchObject({ id: "search-autocomplete", order: 38, available: true, title: "Guess the query after two letters" });
  });

  it("lists lesson 37, Find it among a billion pages", () => {
    expect(lessonSummaries("system-design")[36]).toMatchObject({ id: "search-engine", order: 37, available: true, title: "Find it among a billion pages" });
  });

  it("lists lesson 36, Read the whole web, politely", () => {
    expect(lessonSummaries("system-design")[35]).toMatchObject({ id: "web-crawler", order: 36, available: true, title: "Read the whole web, politely" });
  });

  it("lists lesson 35, One limit across a thousand servers", () => {
    expect(lessonSummaries("system-design")[34]).toMatchObject({ id: "distributed-rate-limiter", order: 35, available: true, title: "One limit across a thousand servers" });
  });

  it("lists lesson 34, A store that always takes the write", () => {
    expect(lessonSummaries("system-design")[33]).toMatchObject({ id: "key-value-store", order: 34, available: true, title: "A store that always takes the write" });
  });

  it("lists lesson 33, Never hand out the same ID twice", () => {
    expect(lessonSummaries("system-design")[32]).toMatchObject({ id: "unique-ids", order: 33, available: true, title: "Never hand out the same ID twice" });
  });

  it("lists lesson 31, Forty-five minutes, one whiteboard", () => {
    expect(lessonSummaries("system-design")[30]).toMatchObject({ id: "design-method", module: "Case studies: the method and the classics", order: 31, available: true, title: "Forty-five minutes, one whiteboard" });
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
