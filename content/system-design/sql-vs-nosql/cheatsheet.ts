import type { Lesson } from "@tintelix/schema";

export const dataCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "Relational: each fact once",
    text: ["Normalized tables joined at read time: showing one order with {items} items touches {sqlRows} rows in {sqlTables} tables. Constraints (NOT NULL, foreign keys) reject bad writes, and any new question is one more query."],
  },
  {
    heading: "Document: one entity, one read",
    text: ["The order and its items in one document: {docReads} read, no join. Embedding copies shared facts, so changing one rewrites every copy: {renameDocs} listings at {writeRate} writes a second take {renameSec}."],
  },
  {
    heading: "Flexible schema",
    text: ["Great when the data's shape genuinely varies. For fixed data it moves checks into every code path that writes: here {badPerDay} orders a day stored without a currency."],
  },
  {
    heading: "The other families",
    text: ["Key-value (Redis, DynamoDB): lookups by key, with typed structures. Wide-column (Cassandra): huge write volume, queries designed into the schema up front. Graph (Neo4j): many-hop relationships."],
  },
];
