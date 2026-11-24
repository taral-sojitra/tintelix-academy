import type { Lesson, SqlLesson, Subject } from "@tintelix/schema";
import { components } from "./components";
import { osiLesson } from "./networks/osi-model/lesson";
import { tcpIpLesson } from "./networks/tcp-ip-model/lesson";
import { ipLesson } from "./networks/ip-addressing/lesson";
import { subnetLesson } from "./networks/subnetting/lesson";
import { arpLesson } from "./networks/arp/lesson";
import { dhcpLesson } from "./networks/dhcp/lesson";
import { tcpUdpLesson } from "./networks/tcp-vs-udp/lesson";
import { select } from "./sql/select/lesson";
import { where } from "./sql/where/lesson";
import { orderBy } from "./sql/order-by/lesson";
import { distinct } from "./sql/distinct/lesson";
import { limitOffset } from "./sql/limit-offset/lesson";
import { aggregates } from "./sql/aggregates/lesson";
import { groupBy } from "./sql/group-by/lesson";
import { having } from "./sql/having/lesson";
import { caseWhen } from "./sql/case-when/lesson";
import { innerJoin } from "./sql/inner-join/lesson";
import { leftJoin } from "./sql/left-join/lesson";
import { cte } from "./sql/cte/lesson";
import { rowNumber } from "./sql/row-number/lesson";
import { insert } from "./sql/insert/lesson";
import { update } from "./sql/update/lesson";
import { remove } from "./sql/delete/lesson";
import { createTable } from "./sql/create-table/lesson";
import { alterTable } from "./sql/alter-table/lesson";
import { createIndex } from "./sql/create-index/lesson";
import { dropTable } from "./sql/drop-table/lesson";
import { truncate } from "./sql/truncate/lesson";
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
import { fileSync } from "./system-design/file-sync/lesson";
import { objectStoreInternals } from "./system-design/object-store-internals/lesson";
import { emailService } from "./system-design/email-service/lesson";
import { messageQueueDesign } from "./system-design/message-queue-design/lesson";
import { metricsAlerting } from "./system-design/metrics-alerting/lesson";
import { clickAggregation } from "./system-design/click-aggregation/lesson";
import { leaderboard } from "./system-design/leaderboard/lesson";
import { ragServing } from "./system-design/rag-serving/lesson";
import { hotelBooking } from "./system-design/hotel-booking/lesson";
import { ordersInventory } from "./system-design/orders-inventory/lesson";
import { paymentSystem } from "./system-design/payment-system/lesson";
import { digitalWallet } from "./system-design/digital-wallet/lesson";
import { stockExchange } from "./system-design/stock-exchange/lesson";
import { replication } from "./system-design/replication/lesson";
import { retriesAndCircuitBreakers } from "./system-design/retries-and-circuit-breakers/lesson";
import { sharding } from "./system-design/sharding/lesson";
import { sqlVsNosql } from "./system-design/sql-vs-nosql/lesson";
import { statelessServices } from "./system-design/stateless-services/lesson";

export { components, subjects };

/** Every written lesson. A lesson listed in a subject but missing here is "coming soon". */
export const lessons: Lesson[] = [latencyPercentiles, queueing, availability, estimation, scaling, loadBalancing, proxies, healthChecks, statelessServices, caching, cdn, sqlVsNosql, indexing, replication, sharding, consistentHashing, bloomFilters, objectStorage, capTheorem, consistencyModels, distributedTransactions, messageQueues, idempotency, rateLimiting, fanOut, apiGateway, monolithVsMicroservices, retriesAndCircuitBreakers, leaderElection, multiRegion, designMethod, urlShortener, uniqueIds, keyValueStore, distributedRateLimiter, webCrawler, searchEngine, searchAutocomplete, notificationService, photoFeed, chatApp, proximityService, nearbyFriends, rideHailing, mapsNavigation, videoStreaming, fileSync, objectStoreInternals, emailService, messageQueueDesign, metricsAlerting, clickAggregation, leaderboard, ragServing, hotelBooking, ordersInventory, paymentSystem, digitalWallet, stockExchange, osiLesson, tcpIpLesson, ipLesson, subnetLesson, arpLesson, dhcpLesson, tcpUdpLesson];

/** Every written SQL lesson (task lessons, not diagram lessons). */
export const sqlLessons: SqlLesson[] = [select, where, orderBy, distinct, limitOffset, aggregates, groupBy, having, caseWhen, innerJoin, leftJoin, cte, rowNumber, insert, update, remove, createTable, alterTable, createIndex, dropTable, truncate];

export function getSqlLesson(slug: string): SqlLesson | undefined {
  return sqlLessons.find((l) => l.slug === slug);
}

export function getSubject(id: string): Subject | undefined {
  return subjects.find((s) => s.id === id);
}

export function getLesson(subject: string, slug: string): Lesson | undefined {
  return lessons.find((l) => l.home === subject && l.slug === slug);
}

/** What a lesson card or the continue card needs, from either kind of lesson. */
export interface LessonFacts {
  title: string;
  topic: string;
  promise: string;
  minutes: number;
  /** Steps of a diagram lesson, or tasks of a SQL lesson. */
  steps: number;
  unit: "step" | "task";
}

export function lessonFacts(subject: string, slug: string): LessonFacts | undefined {
  const d = getLesson(subject, slug);
  if (d) return { title: d.title, topic: d.topic, promise: d.promise, minutes: d.minutes, steps: d.steps.length, unit: "step" };
  const s = subject === "sql" ? getSqlLesson(slug) : undefined;
  if (s) return { title: s.title, topic: s.topic, promise: s.promise, minutes: s.minutes, steps: s.tasks.length, unit: "task" };
  return undefined;
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
  /** The subject the lesson lives in: this one, or another for a shared lesson. */
  home: string;
  /** Where the lesson's page is. */
  href: string;
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
      available: lessons.some((l) => l.id === stub.id) || sqlLessons.some((l) => l.id === stub.id),
      home: stub.home ?? subjectId,
      href: `/${stub.home ?? subjectId}/${stub.slug}`,
    })),
  );
}
