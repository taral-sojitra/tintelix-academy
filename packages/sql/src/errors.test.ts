import { describe, expect, it } from "vitest";
import { plainError } from "./errors";

describe("plainError", () => {
  it("explains a GROUP BY mistake in the LLD's words", () => {
    const m = plainError("42803", 'column "customers.name" must appear in the GROUP BY clause or be used in an aggregate function');
    expect(m).toContain("Every column in SELECT must be in GROUP BY or inside a summary like SUM");
    expect(m).toContain("customers.name");
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
