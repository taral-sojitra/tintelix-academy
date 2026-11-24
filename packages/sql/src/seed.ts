import { PGlite } from "@electric-sql/pglite";
import { pgliteDb, type Db } from "./db";

export { SHOP_TABLES, type ShopTable } from "./tables";

/** The made-up Tintelix Shop every SQL lesson queries. Generated once from a fixed seed, so it never changes. */

const CUSTOMERS: [string, string | null, string, string][] = [
  // name, city, country, signed_up
  ["Aarav Shah", "Ahmedabad", "India", "2025-01-14"],
  ["Diya Patel", "Surat", "India", "2025-02-03"],
  ["Kabir Mehta", "Mumbai", "India", "2025-02-21"],
  ["Ananya Iyer", "Chennai", "India", "2025-03-09"],
  ["Vihaan Rao", "Bengaluru", "India", "2025-03-30"],
  ["Ishita Nair", "Kochi", "India", "2025-04-12"],
  ["Arjun Desai", "Pune", "India", "2025-05-02"],
  ["Meera Joshi", null, "India", "2025-05-19"],
  ["Rohan Gupta", "Delhi", "India", "2025-06-07"],
  ["Saanvi Reddy", "Bengaluru", "India", "2025-06-25"],
  ["Aditya Kulkarni", "Pune", "India", "2025-07-16"],
  ["Tara Fernandes", null, "India", "2025-08-04"],
  ["Nikhil Verma", "Delhi", "India", "2025-08-28"],
  ["Priya Menon", "Dubai", "UAE", "2025-09-15"],
  ["Yash Trivedi", "Ahmedabad", "India", "2025-10-03"],
  ["Zara Khan", "Singapore", "Singapore", "2025-11-11"],
  ["Dev Malhotra", null, "India", "2025-12-01"],
  ["Riya Sen", "Mumbai", "India", "2026-02-17"],
  ["Om Chauhan", "Surat", "India", "2026-06-08"],
  ["Leela Bose", null, "UK", "2026-09-22"],
];

/** Customers who never order: gives LEFT JOIN and NOT EXISTS something to find. */
const NEVER_ORDER = new Set([12, 17, 19, 20]);

const PRODUCTS: [string, string, number, number][] = [
  // name, category, price, stock
  ["Wireless Earbuds", "Electronics", 2499, 120],
  ["Smart Watch", "Electronics", 5999, 45],
  ["Power Bank", "Electronics", 1299, 200],
  ["Bluetooth Speaker", "Electronics", 3499, 60],
  ["USB-C Cable", "Electronics", 499, 500],
  ["Steel Water Bottle", "Home", 699, 300],
  ["Cotton Bedsheet", "Home", 1499, 80],
  ["Table Lamp", "Home", 1299, 40],
  ["Spice Box", "Home", 899, 0],
  ["The Pragmatic Coder", "Books", 599, 70],
  ["Data at Scale", "Books", 899, 35],
  ["Notebook Pack", "Books", 249, 400],
  ["Yoga Mat", "Fitness", 1199, 90],
  ["Dumbbell Pair", "Fitness", 2299, 25],
  ["Skipping Rope", "Fitness", 499, 150],
];

const STATUSES = ["delivered", "delivered", "delivered", "delivered", "shipped", "shipped", "placed", "cancelled"];
const COUPONS = ["WELCOME10", "DIWALI15", "FREESHIP"];

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
const iso = (d: Date) => d.toISOString().slice(0, 10);

function build(): string {
  const rand = mulberry32(2026);
  const pick = <T,>(xs: T[]): T => xs[Math.floor(rand() * xs.length)]!;
  const out: string[] = [
    `CREATE TABLE customers (id serial PRIMARY KEY, name text NOT NULL, email text UNIQUE NOT NULL, city text, country text NOT NULL, signed_up date NOT NULL);`,
    `CREATE TABLE products (id serial PRIMARY KEY, name text NOT NULL, category text NOT NULL, price numeric(10,2) NOT NULL, stock integer NOT NULL);`,
    `CREATE TABLE orders (id serial PRIMARY KEY, customer_id integer NOT NULL REFERENCES customers(id), ordered_at date NOT NULL, status text NOT NULL, total numeric(10,2) NOT NULL, coupon text);`,
    `CREATE TABLE order_items (order_id integer NOT NULL REFERENCES orders(id), product_id integer NOT NULL REFERENCES products(id), quantity integer NOT NULL CHECK (quantity > 0), unit_price numeric(10,2) NOT NULL, PRIMARY KEY (order_id, product_id));`,
  ];

  out.push(
    "INSERT INTO customers (name, email, city, country, signed_up) VALUES\n" +
      CUSTOMERS.map(([name, city, country, signed]) => {
        const email = name.toLowerCase().replace(/[^a-z]+/g, ".") + "@example.com";
        return `(${q(name)}, ${q(email)}, ${city === null ? "NULL" : q(city)}, ${q(country)}, ${q(signed)})`;
      }).join(",\n") + ";",
  );
  out.push(
    "INSERT INTO products (name, category, price, stock) VALUES\n" +
      PRODUCTS.map(([n, c, p, s]) => `(${q(n)}, ${q(c)}, ${p.toFixed(2)}, ${s})`).join(",\n") + ";",
  );

  // 60 orders between 5 Jan and 31 Oct 2026, ids in date order, 150 lines in all.
  const buyers = CUSTOMERS.map((_, i) => i + 1).filter((id) => !NEVER_ORDER.has(id));
  const start = Date.UTC(2026, 0, 5);
  const span = Date.UTC(2026, 9, 31) - start;
  const dates = Array.from({ length: 60 }, () => new Date(start + Math.floor(rand() * span / 86400000) * 86400000)).sort((a, b) => +a - +b);
  const counts = dates.map(() => 1 + Math.floor(rand() * 4));
  let total = counts.reduce((a, b) => a + b, 0);
  while (total !== 150) {
    const i = Math.floor(rand() * counts.length);
    const c = counts[i]!;
    if (total < 150 && c < 4) { counts[i] = c + 1; total++; }
    else if (total > 150 && c > 1) { counts[i] = c - 1; total--; }
  }

  const orderRows: string[] = [];
  const itemRows: string[] = [];
  dates.forEach((date, i) => {
    const orderId = i + 1;
    const eligible = buyers.filter((id) => CUSTOMERS[id - 1]![3] <= iso(date));
    const customer = pick(eligible);
    const chosen = new Set<number>();
    while (chosen.size < counts[i]!) chosen.add(1 + Math.floor(rand() * PRODUCTS.length));
    let sum = 0;
    for (const pid of [...chosen].sort((a, b) => a - b)) {
      const qty = rand() < 0.7 ? 1 : 2 + Math.floor(rand() * 2);
      const price = PRODUCTS[pid - 1]![2];
      sum += qty * price;
      itemRows.push(`(${orderId}, ${pid}, ${qty}, ${price.toFixed(2)})`);
    }
    const coupon = rand() < 0.15 ? q(pick(COUPONS)) : "NULL";
    orderRows.push(`(${customer}, ${q(iso(date))}, ${q(pick(STATUSES))}, ${sum.toFixed(2)}, ${coupon})`);
  });
  out.push("INSERT INTO orders (customer_id, ordered_at, status, total, coupon) VALUES\n" + orderRows.join(",\n") + ";");
  out.push("INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES\n" + itemRows.join(",\n") + ";");
  return out.join("\n");
}

export const SHOP_SQL: string = build();

/** A fresh shop in a new in-memory Postgres (Node and tests; the browser worker does the same itself). */
export async function openShop(): Promise<Db> {
  const pg = await PGlite.create();
  await pg.exec(SHOP_SQL);
  return pgliteDb(pg);
}
