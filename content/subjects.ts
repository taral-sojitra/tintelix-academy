import type { Subject } from "@tintelix/schema";
import { systemDesign } from "./system-design/subject";

const later = (id: Subject["id"], title: string, blurb: string, phase: number): Subject => ({ id, title, blurb, phase, modules: [] });

/** All seven subjects, in the HLD's order. Only System Design has lessons in Phase 1. */
export const subjects: Subject[] = [
  systemDesign,
  later("networks", "Computer Networks", "What happens between the click and the reply: DNS, TCP, TLS and HTTP.", 2),
  later("apis", "APIs", "Design, call and break real HTTP APIs against a mock server in your browser.", 2),
  later("linux", "Linux", "Files, permissions, processes and pipes, in a practice shell that runs in your browser.", 2),
  later("microservices", "Microservices", "Services that call each other, fail, retry and trace their way to an answer.", 2),
  later("sql", "SQL", "Real queries against a real Postgres, running in your browser.", 3),
  later("dsa", "DSA", "Data structures and algorithms you can step through, one move at a time.", 3),
];
