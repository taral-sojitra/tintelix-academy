import type { Subject } from "@tintelix/schema";

const l = (id: string, topic: string, summary: string, buildsOn: string[] = [], title?: string) => ({
  id, slug: id, topic, summary, buildsOn, ...(title ? { title } : {}),
});

/** The 59 System Design lessons in thirteen modules: eight of concepts (HLD §5), then five of case studies. */
export const systemDesign: Subject = {
  id: "system-design",
  title: "System Design",
  blurb: "How big systems stay fast and stay up, one moving diagram at a time.",
  phase: 1,
  modules: [
    {
      title: "Measuring systems",
      lessons: [
        l("latency-percentiles", "Latency percentiles", "Requests land on a histogram; the average stays calm while p99 explodes.", [], "The average is lying"),
        l("queueing", "Queueing and utilization", "Busyness slides from 50% to 95% and the wait time goes vertical, as Little's law predicts.", ["latency-percentiles"], "Busy, then suddenly slow"),
        l("availability", "Availability and the nines", "Three 99.9% services in a chain lower availability; two side by side raise it.", [], "Nobody broke their promise"),
        l("estimation", "Back-of-envelope estimation", "Daily users become peak requests a second, then storage, in a live calculator.", ["queueing"], "From users to servers"),
      ],
    },
    {
      title: "Scaling out",
      lessons: [
        l("vertical-horizontal-scaling", "Vertical vs horizontal scaling", "One server grows until no bigger machine exists, then the same traffic splits across three smaller ones.", [], "Bigger box or more boxes?"),
        l("load-balancing", "Load balancing", "A load balancer spreads traffic; round robin struggles with heavy requests, least connections copes.", ["vertical-horizontal-scaling"], "Who gets the next request?"),
        l("proxies", "Forward and reverse proxy", "A forward proxy speaks for the clients; a reverse proxy speaks for the servers.", ["load-balancing"], "Who speaks for whom?"),
        l("health-checks", "Heartbeats and health checks", "A server dies silently, its heartbeats stop, and the load balancer stops sending it traffic.", ["load-balancing"], "Is anyone still there?"),
        l("stateless-services", "Stateless services and sticky sessions", "A deploy kills a server holding 5,000 sessions; moving sessions to Redis lets any server answer.", ["load-balancing"], "Where does my login live?"),
      ],
    },
    {
      title: "Speed",
      lessons: [
        l("caching", "Caching", "The database drowns; cache-aside fixes it; every key expires at once; random TTLs spread the expiry.", ["vertical-horizontal-scaling"], "Survive the flash sale"),
        l("cdn", "CDN", "A user far away waits on distant servers; copies at the edge cut the round trips.", ["caching"], "Serve Mumbai from Mumbai"),
      ],
    },
    {
      title: "Data storage",
      lessons: [
        l("sql-vs-nosql", "SQL vs NoSQL", "The same orders stored as joined tables and as documents, and which questions each answers cheaply.", [], "Tables or documents?"),
        l("indexing", "Indexing", "A full table scan touches every row; a B-tree index jumps straight to it; every extra index slows writes.", ["sql-vs-nosql"], "Stop reading every row"),
        l("replication", "Replication", "A primary copies writes to replicas; replica lag shows a stale read; failover promotes a replica.", ["sql-vs-nosql"], "Copies that fall behind"),
        l("sharding", "Database sharding", "Splitting by key range creates a hot spot; splitting by hash evens it out.", ["replication"], "Too big for one database"),
        l("consistent-hashing", "Consistent hashing", "Adding a server with hash mod N moves almost every key; a hash ring moves only one slice.", ["sharding"], "Add a server, move few keys"),
        l("bloom-filters", "Bloom filters", "A small bit array answers \"definitely not here\" or \"maybe here\" without touching the disk.", ["indexing"], "Definitely not here"),
        l("object-storage", "Object storage", "An upload goes straight to object storage with a signed URL while the app server stays out of the way.", ["cdn"], "Let uploads skip your servers"),
      ],
    },
    {
      title: "Consistency",
      lessons: [
        l("cap-theorem", "CAP theorem", "A network split: refuse requests to stay consistent, or answer with possibly stale data to stay available.", ["replication"], "When the network splits"),
        l("consistency-models", "Consistency models", "One timeline of writes and reads, replayed under strong, read-your-writes, causal and eventual consistency.", ["cap-theorem"], "How current is this read?"),
        l("distributed-transactions", "Distributed transactions", "Two-phase commit locks both sides; a saga undoes completed steps when a later one fails.", ["consistency-models"], "One order, three services"),
      ],
    },
    {
      title: "Messaging and reliability",
      lessons: [
        l("message-queues", "Message queues", "A queue absorbs a traffic spike; workers drain it at their own pace; failures go to a dead-letter queue.", ["load-balancing"], "Absorb the spike"),
        l("idempotency", "Idempotency", "A retried payment charges twice; an idempotency key makes the second call return the first result.", ["message-queues"], "Charged twice?"),
        l("rate-limiting", "Rate limiting", "One client floods the API; a token bucket lets short bursts through and refuses the rest with 429.", ["load-balancing"], "One client floods the API"),
        l("fan-out", "Fan-out and the news feed", "A celebrity posts: copy it into every follower's feed at write time, or merge feeds at read time.", ["message-queues"], "A celebrity posts"),
      ],
    },
    {
      title: "Services",
      lessons: [
        l("api-gateway", "API gateway", "A gateway becomes one front door for sign-in checks, routing and rate limits.", ["proxies", "rate-limiting"], "One front door"),
        l("monolith-vs-microservices", "Monolith vs microservices", "One deploy for everything vs many small deploys, and where network calls start to cost.", ["distributed-transactions", "api-gateway"], "Split it, or keep it whole?"),
      ],
    },
    {
      title: "Staying up",
      lessons: [
        l("retries-and-circuit-breakers", "Timeouts, retries and circuit breakers", "A retry storm buries a slow service; jittered backoff spreads it out; a circuit breaker trips and lets it recover; a timeout stops a call from waiting forever.", ["idempotency"], "Don't kick a slow service"),
        l("leader-election", "Leader election and consensus", "The leader dies, the rest elect a new one, and a fencing token stops the old leader's stale write.", ["replication", "cap-theorem"], "Who's in charge now?"),
        l("multi-region", "Multi-region and failover", "A region goes down: active-passive fails over, active-active keeps serving, and replication lag crosses oceans.", ["cdn", "replication"], "A whole region goes dark"),
      ],
    },
    {
      title: "Case studies: the method and the classics",
      lessons: [
        l("design-method", "How to approach a design problem", "Turn a vague ask into requirements, numbers, an API, a first design, and the bottleneck to fix next.", ["estimation"], "Forty-five minutes, one whiteboard"),
        l("url-shortener", "Design a URL shortener", "Store billions of links, mint short codes that never clash, and serve forty reads for every write.", ["estimation", "caching", "sharding"], "Turn a long link into seven characters"),
        l("unique-ids", "Design a unique ID generator", "Hand out IDs from many machines at once without a single one repeating, and keep them roughly in order.", ["sharding", "leader-election"], "Never hand out the same ID twice"),
        l("key-value-store", "Design a key-value store", "Spread keys over a ring of nodes, copy each to three, and keep taking writes when a node is down.", ["replication", "sharding", "consistent-hashing", "bloom-filters", "cap-theorem", "consistency-models"], "A store that always takes the write"),
        l("distributed-rate-limiter", "Design a distributed rate limiter", "Enforce one limit per user when their requests land on a thousand different servers.", ["rate-limiting", "api-gateway"], "One limit across a thousand servers"),
        l("web-crawler", "Design a web crawler", "Fetch billions of pages without hammering any one site or reading the same page twice.", ["bloom-filters", "message-queues"], "Read the whole web, politely"),
        l("search-engine", "Design a search engine", "Build an inverted index over billions of pages and answer a query in a fraction of a second.", ["indexing", "sharding", "web-crawler"], "Find it among a billion pages"),
        l("search-autocomplete", "Design search autocomplete", "Suggest the top completions after two keystrokes, from a trie kept small and served from memory.", ["caching", "sharding"], "Guess the query after two letters"),
      ],
    },
    {
      title: "Case studies: social and real time",
      lessons: [
        l("notification-service", "Design a notification service", "Send push, SMS and email to millions through queues, without losing one or sending it twice.", ["message-queues", "idempotency", "rate-limiting", "retries-and-circuit-breakers"], "A million alerts, none sent twice"),
        l("photo-feed", "Design a photo feed (news feed)", "Build each person's home feed fast by mixing posts pushed ahead of time with posts pulled on read.", ["caching", "object-storage", "fan-out"], "Fill the home feed in a blink"),
        l("chat-app", "Design a chat app (one-to-one, groups, channels)", "Keep millions of connections open and deliver every message once, in order, with read receipts.", ["health-checks", "message-queues", "fan-out", "unique-ids"]),
        l("proximity-service", "Design a proximity service", "Find the places within a few kilometres of a user by cutting the map into cells.", ["caching", "indexing", "replication"]),
        l("nearby-friends", "Design nearby friends", "Show which friends are close right now as millions of phones report where they are.", ["fan-out", "chat-app", "proximity-service"]),
        l("ride-hailing", "Design ride hailing", "Match each rider to a nearby driver in seconds while every driver's location keeps moving.", ["proximity-service", "nearby-friends"]),
        l("maps-navigation", "Design maps and navigation", "Serve map tiles from the edge and find the fastest route across a graph of roads.", ["cdn", "proximity-service"]),
      ],
    },
    {
      title: "Case studies: media and files",
      lessons: [
        l("video-streaming", "Design video streaming (YouTube, Netflix)", "Turn one upload into many sizes and stream it from servers close to every viewer.", ["cdn", "object-storage", "message-queues"]),
        l("file-sync", "Design cloud storage and file sync (Drive, Dropbox)", "Split files into blocks, upload only what changed, and keep every device in step.", ["object-storage", "consistency-models"]),
        l("object-store-internals", "Design S3-like object storage", "Store a trillion objects across disks that fail every day, and lose none of them.", ["replication", "object-storage"]),
        l("email-service", "Design an email service", "Receive, store and search mail for a billion inboxes, and send it out without landing in spam.", ["sharding", "object-storage", "search-engine"]),
      ],
    },
    {
      title: "Case studies: data pipelines",
      lessons: [
        l("message-queue-design", "Design a distributed message queue", "Keep every message on disk in partitions, copied to several brokers, and let readers replay from any point.", ["replication", "message-queues", "leader-election"]),
        l("metrics-alerting", "Design metrics monitoring and alerting", "Collect millions of numbers a second, roll them up over time, and alert before users notice.", ["latency-percentiles", "availability", "health-checks"]),
        l("click-aggregation", "Design ad click aggregation (analytics)", "Count every ad click once, in windows of time, even when events arrive late or twice.", ["message-queues", "idempotency", "message-queue-design"]),
        l("leaderboard", "Design a real-time leaderboard", "Rank millions of players live with a sorted set, and show anyone their place in a blink.", ["caching", "sharding"]),
        l("rag-serving", "Design a RAG and model-serving system", "Find the right passages in your own documents and hand them to a model that answers in seconds.", ["caching", "message-queues", "api-gateway"]),
      ],
    },
    {
      title: "Case studies: money and orders",
      lessons: [
        l("hotel-booking", "Design hotel booking", "Let thousands of people book at once without selling the same room twice.", ["distributed-transactions", "idempotency"]),
        l("orders-inventory", "Design orders and inventory", "Take an order, hold the stock, charge the card, and undo it all cleanly if a step fails.", ["distributed-transactions", "message-queues", "idempotency"]),
        l("payment-system", "Design a payment system", "Charge a card exactly once through flaky providers, and keep a ledger where every cent adds up.", ["distributed-transactions", "idempotency", "retries-and-circuit-breakers"]),
        l("digital-wallet", "Design a digital wallet", "Move money between millions of wallets with an event log that can rebuild any balance.", ["sharding", "distributed-transactions", "payment-system"]),
        l("stock-exchange", "Design a stock exchange", "Match buy and sell orders in microseconds on one fast path, and broadcast every trade.", ["message-queues", "unique-ids"]),
      ],
    },
  ],
};
