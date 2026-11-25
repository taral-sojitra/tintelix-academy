import type { Subject } from "@tintelix/schema";
import { dsa } from "./dsa/subject";
import { networks } from "./networks/subject";
import { sql } from "./sql/subject";
import { systemDesign } from "./system-design/subject";

const later = (id: Subject["id"], title: string, blurb: string, phase: number): Subject => ({ id, title, blurb, phase, modules: [] });

/** All seven subjects, in the HLD's order. System Design, Networks, SQL and DSA have lessons so far. */
export const subjects: Subject[] = [
  systemDesign,
  networks,
  later("apis", "APIs", "Design, call and break real HTTP APIs against a mock server in your browser.", 2),
  later("linux", "Linux", "Files, permissions, processes and pipes, in a practice shell that runs in your browser.", 2),
  later("microservices", "Microservices", "Services that call each other, fail, retry and trace their way to an answer.", 2),
  sql,
  dsa,
];
