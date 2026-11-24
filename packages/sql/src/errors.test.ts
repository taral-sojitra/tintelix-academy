import { describe, expect, it } from "vitest";
import { plainError } from "./errors";

describe("plainError", () => {
  it("explains a GROUP BY mistake in the LLD's words", () => {
    const m = plainError("42803", 'column "customers.name" must appear in the GROUP BY clause or be used in an aggregate function');
    expect(m).toContain("Every column in SELECT must be in GROUP BY or inside a summary like SUM");
    expect(m).toContain("customers.name");
  });
  it("sends a summary in WHERE to HAVING", () => {
    expect(plainError("42803", "aggregate functions are not allowed in WHERE")).toBe("Summaries like count(*) can't go in WHERE, because WHERE runs before rows are grouped. Test them in HAVING.");
  });
  it("sends a window function in WHERE to a WITH step", () => {
    expect(plainError("42P20", "window functions are not allowed in WHERE")).toBe("Window functions can't go in WHERE, because they're worked out after it. Number the rows in a WITH step, then filter in the main query.");
  });
  it("says which rows still point at the rows being deleted", () => {
    expect(plainError("23503", 'update or delete on table "orders" violates foreign key constraint "order_items_order_id_fkey" on table "order_items"'))
      .toBe("Rows in order_items still point at the orders rows you're removing. Delete or change those first.");
  });
  it("says a new row would point at nothing", () => {
    expect(plainError("23503", 'insert or update on table "orders" violates foreign key constraint "orders_customer_id_fkey"'))
      .toBe("That orders row would point at a row that doesn't exist (orders_customer_id_fkey).");
  });
  it("names the unknown type and suggests real ones", () => {
    expect(plainError("42704", 'type "strng" does not exist')).toBe("There's no type called strng. Common ones: integer, numeric(10,2), text, date, boolean.");
  });
  it("names the unknown column", () => {
    expect(plainError("42703", 'column "nme" does not exist')).toBe("There's no column called nme. Check the spelling against the dataset card.");
  });
  it("names the unknown table", () => {
    expect(plainError("42P01", 'relation "custmers" does not exist')).toBe("There's no table called custmers. Check the spelling against the dataset card.");
  });
  it("points at a typo", () => {
    expect(plainError("42601", 'syntax error at or near "SELEC"')).toMatch(/^There's a typo near SELEC/);
  });
  it("tells you to say which table an ambiguous column is from", () => {
    expect(plainError("42702", 'column reference "id" is ambiguous')).toContain("o.id");
  });
  it("passes anything else through", () => {
    expect(plainError("XX000", "something odd")).toBe("Postgres says: something odd");
    expect(plainError(undefined, "no code")).toBe("Postgres says: no code");
  });
});
