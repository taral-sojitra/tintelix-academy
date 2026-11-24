/** What the Tintelix Shop holds, for the dataset card. Kept apart from the seed so the page can show it without loading Postgres. */

export interface ShopTable {
  name: string;
  blurb: string;
  columns: { name: string; type: string; note?: string }[];
}

export const SHOP_TABLES: ShopTable[] = [
  {
    name: "customers",
    blurb: "People who signed up. Some have never ordered, some never told us their city.",
    columns: [
      { name: "id", type: "integer", note: "primary key" },
      { name: "name", type: "text" },
      { name: "email", type: "text", note: "unique" },
      { name: "city", type: "text", note: "can be NULL" },
      { name: "country", type: "text" },
      { name: "signed_up", type: "date" },
    ],
  },
  {
    name: "products",
    blurb: "What the shop sells, in four categories. Prices in rupees.",
    columns: [
      { name: "id", type: "integer", note: "primary key" },
      { name: "name", type: "text" },
      { name: "category", type: "text" },
      { name: "price", type: "numeric(10,2)" },
      { name: "stock", type: "integer" },
    ],
  },
  {
    name: "orders",
    blurb: "One row per order. The total is the sum of the order's lines.",
    columns: [
      { name: "id", type: "integer", note: "primary key" },
      { name: "customer_id", type: "integer", note: "→ customers.id" },
      { name: "ordered_at", type: "date" },
      { name: "status", type: "text", note: "placed, shipped, delivered or cancelled" },
      { name: "total", type: "numeric(10,2)" },
      { name: "coupon", type: "text", note: "usually NULL" },
    ],
  },
  {
    name: "order_items",
    blurb: "The lines of each order: which product, how many, at what price.",
    columns: [
      { name: "order_id", type: "integer", note: "→ orders.id" },
      { name: "product_id", type: "integer", note: "→ products.id" },
      { name: "quantity", type: "integer" },
      { name: "unit_price", type: "numeric(10,2)" },
    ],
  },
];
