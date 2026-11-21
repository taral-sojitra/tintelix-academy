import type { Subject } from "@tintelix/schema";

const l = (id: string, topic: string, summary: string, buildsOn: string[] = [], title?: string) => ({
  id, slug: id, topic, summary, buildsOn, ...(title ? { title } : {}),
});

/** The 30 System Design lessons in eight modules (HLD §5). */
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
        l("proxies", "Forward and reverse proxy", "A forward proxy speaks for the clients; a reverse proxy speaks for the servers.", ["load-balancing"]),
        l("health-checks", "Heartbeats and health checks", "A server dies silently, its heartbeats stop, and the load balancer stops sending it traffic.", ["load-balancing"]),
        l("stateless-services", "Stateless services and sticky sessions", "A deploy kills a server holding 5,000 sessions; moving sessions to Redis lets any server answer.", ["load-balancing"]),
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
        l("replication", "Replication", "A primary copies writes to replicas; replica lag shows a stale read; failover promotes a replica.", ["sql-vs-nosql"]),
        l("sharding", "Database sharding", "Splitting by key range creates a hot spot; splitting by hash evens it out.", ["replication"], "Too big for one database"),
        l("consistent-hashing", "Consistent hashing", "Adding a server with hash mod N moves almost every key; a hash ring moves only one slice.", ["sharding"]),
        l("bloom-filters", "Bloom filters", "A small bit array answers \"definitely not here\" or \"maybe here\" without touching the disk.", ["indexing"]),
        l("object-storage", "Object storage", "An upload goes straight to object storage with a signed URL while the app server stays out of the way.", ["cdn"]),
      ],
    },
    {
      title: "Consistency",
      lessons: [
        l("cap-theorem", "CAP theorem", "A network split: refuse requests to stay consistent, or answer with possibly stale data to stay available.", ["replication"]),
        l("consistency-models", "Consistency models", "One timeline of writes and reads, replayed under strong, read-your-writes, causal and eventual consistency.", ["cap-theorem"]),
        l("distributed-transactions", "Distributed transactions", "Two-phase commit locks both sides; a saga undoes completed steps when a later one fails.", ["consistency-models"]),
      ],
    },
    {
      title: "Messaging and reliability",
      lessons: [
        l("message-queues", "Message queues", "A queue absorbs a traffic spike; workers drain it at their own pace; failures go to a dead-letter queue.", ["load-balancing"]),
        l("idempotency", "Idempotency", "A retried payment charges twice; an idempotency key makes the second call return the first result.", ["message-queues"]),
        l("rate-limiting", "Rate limiting", "One client floods the API; a token bucket lets short bursts through and refuses the rest with 429.", ["load-balancing"]),
        l("fan-out", "Fan-out and the news feed", "A celebrity posts: copy it into every follower's feed at write time, or merge feeds at read time.", ["message-queues"]),
      ],
    },
    {
      title: "Services",
      lessons: [
        l("api-gateway", "API gateway", "A gateway becomes one front door for sign-in checks, routing and rate limits.", ["proxies", "rate-limiting"]),
        l("monolith-vs-microservices", "Monolith vs microservices", "One deploy for everything vs many small deploys, and where network calls start to cost.", ["distributed-transactions", "api-gateway"]),
      ],
    },
    {
      title: "Staying up",
      lessons: [
        l("retries-and-circuit-breakers", "Retries, backoff and circuit breakers", "A retry storm buries a slow service; jittered backoff spreads it out; a circuit breaker trips and lets it recover.", ["idempotency"]),
        l("leader-election", "Leader election and consensus", "The leader dies, the rest elect a new one, and a fencing token stops the old leader's stale write.", ["replication", "cap-theorem"]),
        l("multi-region", "Multi-region and failover", "A region goes down: active-passive fails over, active-active keeps serving, and replication lag crosses oceans.", ["cdn", "replication"]),
      ],
    },
  ],
};
