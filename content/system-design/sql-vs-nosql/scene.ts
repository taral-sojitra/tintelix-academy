import type { SceneSpec } from "@tintelix/schema";

/**
 * Top row: the relational side (orders, order_items, products; sellers for the rename). Bottom: the
 * document side (an orders collection; a listings collection for the rename).
 */
const TOP = 70;
const ROW_H = 104;
const DOC_Y = 280;
const DOC_H = 136;
const SQL_IN: [number, number] = [300, TOP + ROW_H / 2];
const DOC_IN: [number, number] = [300, DOC_Y + DOC_H / 2];

export const dataScene: SceneSpec = {
  kind: "data",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 40, w: 984, h: 390 },
  nodes: {
    app: { x: 16, y: 196, w: 176, h: 90, kind: "app", label: "Shop app", sub: "shows an order" },
    orders: { x: 300, y: TOP, w: 200, h: ROW_H, kind: "db", label: "orders", sub: "a row per order" },
    items: { x: 530, y: TOP, w: 200, h: ROW_H, kind: "db", label: "order_items", sub: "a row per item" },
    products: { x: 760, y: TOP, w: 210, h: ROW_H, kind: "db", label: "products", sub: "a row per product" },
    sellers: { x: 300, y: TOP, w: 300, h: ROW_H, kind: "db", label: "sellers", sub: "a row per seller", hidden: true },
    docs: { x: 300, y: DOC_Y, w: 440, h: DOC_H, kind: "services", label: "orders collection", sub: "one document per order", hidden: true },
    listings: { x: 300, y: DOC_Y, w: 440, h: DOC_H, kind: "services", label: "listings collection", sub: "each embeds the seller's name", hidden: true },
  },
  wires: {
    a_o: { from: [192, 226], to: SQL_IN },
    o_i: { from: [500, TOP + ROW_H / 2], to: [530, TOP + ROW_H / 2] },
    i_p: { from: [730, TOP + ROW_H / 2], to: [760, TOP + ROW_H / 2] },
    a_s: { from: [192, 226], to: SQL_IN },
    a_d: { from: [192, 256], to: DOC_IN },
    a_l: { from: [192, 256], to: DOC_IN },
  },
};
