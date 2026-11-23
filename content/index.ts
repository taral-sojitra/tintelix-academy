import type { Lesson, Subject } from "@tintelix/schema";
import { components } from "./components";
import { subjects } from "./subjects";
import { caching } from "./system-design/caching/lesson";
import { cdn } from "./system-design/cdn/lesson";
import { latencyPercentiles } from "./system-design/latency-percentiles/lesson";
import { queueing } from "./system-design/queueing/lesson";
import { apiGateway } from "./system-design/api-gateway/lesson";
import { availability } from "./system-design/availability/lesson";
import { estimation } from "./system-design/estimation/lesson";
import { scaling } from "./system-design/scaling/lesson";
import { loadBalancing } from "./system-design/load-balancing/lesson";
import { healthChecks } from "./system-design/health-checks/lesson";
import { proxies } from "./system-design/proxies/lesson";
import { bloomFilters } from "./system-design/bloom-filters/lesson";
import { capTheorem } from "./system-design/cap-theorem/lesson";
import { consistencyModels } from "./system-design/consistency-models/lesson";
import { distributedTransactions } from "./system-design/distributed-transactions/lesson";
import { consistentHashing } from "./system-design/consistent-hashing/lesson";
import { fanOut } from "./system-design/fan-out/lesson";
import { idempotency } from "./system-design/idempotency/lesson";
import { indexing } from "./system-design/indexing/lesson";
import { messageQueues } from "./system-design/message-queues/lesson";
import { monolithVsMicroservices } from "./system-design/monolith-vs-microservices/lesson";
import { objectStorage } from "./system-design/object-storage/lesson";
import { rateLimiting } from "./system-design/rate-limiting/lesson";
import { leaderElection } from "./system-design/leader-election/lesson";
import { multiRegion } from "./system-design/multi-region/lesson";
import { designMethod } from "./system-design/design-method/lesson";
import { urlShortener } from "./system-design/url-shortener/lesson";
import { uniqueIds } from "./system-design/unique-ids/lesson";
import { keyValueStore } from "./system-design/key-value-store/lesson";
import { distributedRateLimiter } from "./system-design/distributed-rate-limiter/lesson";
import { webCrawler } from "./system-design/web-crawler/lesson";
import { searchEngine } from "./system-design/search-engine/lesson";
import { searchAutocomplete } from "./system-design/search-autocomplete/lesson";
import { notificationService } from "./system-design/notification-service/lesson";
import { photoFeed } from "./system-design/photo-feed/lesson";
import { chatApp } from "./system-design/chat-app/lesson";
import { proximityService } from "./system-design/proximity-service/lesson";
import { nearbyFriends } from "./system-design/nearby-friends/lesson";
import { rideHailing } from "./system-design/ride-hailing/lesson";
import { mapsNavigation } from "./system-design/maps-navigation/lesson";
import { videoStreaming } from "./system-design/video-streaming/lesson";
import { replication } from "./system-design/replication/lesson";
import { retriesAndCircuitBreakers } from "./system-design/retries-and-circuit-breakers/lesson";
import { sharding } from "./system-design/sharding/lesson";
import { sqlVsNosql } from "./system-design/sql-vs-nosql/lesson";
import { statelessServices } from "./system-design/stateless-services/lesson";

export { components, subjects };

/** Every written lesson. A lesson listed in a subject but missing here is "coming soon". */
export const lessons: Lesson[] = [latencyPercentiles, queueing, availability, estimation, scaling, loadBalancing, proxies, healthChecks, statelessServices, caching, cdn, sqlVsNosql, indexing, replication, sharding, consistentHashing, bloomFilters, objectStorage, capTheorem, consistencyModels, distributedTransactions, messageQueues, idempotency, rateLimiting, fanOut, apiGateway, monolithVsMicroservices, retriesAndCircuitBreakers, leaderElection, multiRegion, designMethod, urlShortener, uniqueIds, keyValueStore, distributedRateLimiter, webCrawler, searchEngine, searchAutocomplete, notificationService, photoFeed, chatApp, proximityService, nearbyFriends, rideHailing, mapsNavigation, videoStreaming];

export function getSubject(id: string): Subject | undefined {
  return subjects.find((s) => s.id === id);
}

export function getLesson(subject: string, slug: string): Lesson | undefined {
  return lessons.find((l) => l.home === subject && l.slug === slug);
}

export interface LessonSummary {
  id: string;
  slug: string;
  topic: string;
  title?: string;
  summary: string;
  module: string;
  order: number;
  available: boolean;
}

/** Lessons of a subject in teaching order, numbered from 1. */
export function lessonSummaries(subjectId: string): LessonSummary[] {
  const subject = getSubject(subjectId);
  if (!subject) return [];
  let order = 0;
  return subject.modules.flatMap((m) =>
    m.lessons.map((stub) => ({
      id: stub.id,
      slug: stub.slug,
      topic: stub.topic,
      ...(stub.title ? { title: stub.title } : {}),
      summary: stub.summary,
      module: m.title,
      order: ++order,
      available: lessons.some((l) => l.id === stub.id),
    })),
  );
}
