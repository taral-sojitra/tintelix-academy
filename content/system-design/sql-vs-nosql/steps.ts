import type { Step } from "@tintelix/schema";

const TABLES = ["orders", "items", "products"];
const DOCS = ["docs"];

export const dataSteps: Step[] = [
  {
    id: "tables",
    tag: "technique",
    title: "One order across three tables",
    short: "Tables",
    text: [
      "A relational database stores each fact once. An order is a row in orders, each of its {items} items is a row in order_items, and each item points at a row in products.",
      "Showing the order joins the tables: **{sqlRows}** rows across {sqlTables} tables, with {joins} joins. Nothing is copied, so a product's name lives in exactly one row.",
    ],
    note: { kind: "watch", text: "Each query hops through all three tables before it can answer." },
    sim: { mode: "read", speed: 1 },
    live: "LIVE · relational",
  },
  {
    id: "documents",
    tag: "technique",
    title: "The whole order in one document",
    short: "Documents",
    text: [
      "A document database stores the order as one JSON document, with its items, names and prices embedded. Showing it is **{docReads}** read, with no join.",
      "Embedding means copying: every order carries its own copy of each product's name, and every listing carries its seller's name.",
    ],
    note: { kind: "idea", text: "Documents fit data you read and write as one whole thing: an order, a profile, a settings blob." },
    changed: [{ kind: "add", label: "Document database" }],
    scene: { add: DOCS },
    sim: { mode: "read", speed: 1 },
    live: "LIVE · tables and documents",
  },
  {
    id: "rename",
    tag: "problem",
    title: "A seller changes their name",
    short: "Rename",
    text: [
      "A seller with {listings} listings changes their display name. In the relational database that is **{sqlRenameRows}** row in sellers, and every listing sees it through the join.",
      "In the document database every listing embeds the name, so all **{renameDocs}** must be rewritten. At {writeRate} writes a second that is **{renameSec}** of write capacity, competing with real orders. Try it: change the number of listings.",
    ],
    note: { kind: "watch", text: "One quick update on top; a long rewrite below." },
    changed: [{ kind: "mod", label: "Seller name", value: "renamed" }],
    scene: { add: ["sellers", "listings"], remove: [...TABLES, ...DOCS] },
    sim: { mode: "rename", speed: 1 },
    controls: ["listings"],
    live: "LIVE · rename",
  },
  {
    id: "schema",
    tag: "problem",
    title: "A flexible schema moves the checks",
    short: "Schema",
    text: [
      "A new checkout path forgets the currency on {badPct} of orders. The orders table says currency NOT NULL, so those writes fail at once and the bug shows up in testing.",
      "The document database stores them happily: **{badPerDay}** orders a day with no currency, found weeks later when the revenue report breaks. For data whose shape really varies, a flexible schema helps; for fixed data, it is validation put off.",
    ],
    note: { kind: "tip", text: "Most document databases can validate a schema too. Turn it on for data whose shape is fixed." },
    changed: [{ kind: "mod", label: "orders.currency", value: "NOT NULL" }],
    scene: { add: ["orders", ...DOCS], remove: ["sellers", "listings"] },
    sim: { mode: "schema", speed: 1 },
    live: "LIVE · bad writes",
  },
  {
    id: "recap",
    tag: "recap",
    title: "What tables and documents taught us",
    short: "Recap",
    text: [
      "Documents win when you read or write one whole thing at a time: {docReads} read instead of {sqlRows} rows. Tables win when facts are shared or change ({sqlRenameRows} row instead of {renameDocs}), when they must be checked, and when you'll ask questions nobody planned for.",
      "Key-value stores answer lookups by one key; graph databases walk relationships many hops deep. Choose by how the data is read and written, not by which one scales.",
    ],
    note: { kind: "next", text: "Coming up in Indexing: why a query can still read every row, and how an index stops it." },
    scene: { add: ["items", "products"] },
    sim: { mode: "read", speed: 1 },
    live: "LIVE · recap",
  },
];
