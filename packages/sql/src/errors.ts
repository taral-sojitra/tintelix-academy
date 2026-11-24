/** Postgres error codes turned into plain words. Unknown codes pass Postgres's own message through. */

const quoted = (message: string, n = 0): string => [...message.matchAll(/"([^"]*)"/g)][n]?.[1] ?? "";

const RULES: Record<string, (message: string) => string> = {
  "42601": (m) => {
    const near = quoted(m);
    if (/at end of input/.test(m)) return "There's a typo: the query stops before it's finished. Is something missing at the end?";
    return `There's a typo near ${near || "that point"}: Postgres couldn't read the query from there.`;
  },
  "42703": (m) => `There's no column called ${quoted(m)}. Check the spelling against the dataset card.`,
  "42P01": (m) => `There's no table called ${quoted(m)}. Check the spelling against the dataset card.`,
  "42803": (m) => `Every column in SELECT must be in GROUP BY or inside a summary like SUM. ${quoted(m)} is neither.`,
  "42702": (m) => `${quoted(m)} is in more than one table here. Say which one you mean, like o.id or c.id.`,
  "42883": (m) => `Postgres has no function or operator that fits here (${m}). The types may not match: text and numbers don't mix.`,
  "42P07": (m) => `There's already a table called ${quoted(m)}.`,
  "42701": (m) => `There's already a column called ${quoted(m)}.`,
  "22012": () => "The query divided by zero. Postgres stops rather than guess.",
  "22P02": (m) => `${m.split(": ").pop()?.replace(/"/g, "") ?? "That value"} isn't a valid value for that column's type.`,
  "23505": (m) => `That would put a duplicate where values must be unique (${quoted(m)}).`,
  "23502": (m) => `${quoted(m)} can't be empty (NULL) in ${quoted(m, 1)}.`,
  "23503": (m) => `That breaks a link between tables (${quoted(m, 2) || quoted(m, 1)}): a row would point at something that doesn't exist.`,
  "23514": (m) => `That value breaks a rule on the table (${quoted(m, 1) || quoted(m)}).`,
  "2BP01": () => "Other things depend on this table. Add CASCADE to drop them too, or drop them first.",
  "21000": () => "A subquery returned more than one row where only one fits.",
  "42P10": () => "ORDER BY in a SELECT DISTINCT must use columns from the SELECT list.",
};

export function plainError(code: string | undefined, message: string): string {
  const rule = code ? RULES[code] : undefined;
  return rule ? rule(message) : `Postgres says: ${message}`;
}
