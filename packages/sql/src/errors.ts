/** Postgres error codes turned into plain words. Unknown codes pass Postgres's own message through. */

const quoted = (message: string, n = 0): string => [...message.matchAll(/"([^"]*)"/g)][n]?.[1] ?? "";

const RULES: Record<string, (message: string, detail?: string) => string> = {
  "42601": (m) => {
    const near = quoted(m);
    if (/at end of input/.test(m)) return "There's a typo: the query stops before it's finished. Is something missing at the end?";
    return `There's a typo near ${near || "that point"}: Postgres couldn't read the query from there.`;
  },
  "42703": (m) => `There's no column called ${quoted(m)}. Check the spelling against the dataset card.`,
  "42P01": (m) => `There's no table called ${quoted(m)}. Check the spelling against the dataset card.`,
  "42803": (m) =>
    /not allowed in WHERE/i.test(m)
      ? "Summaries like count(*) can't go in WHERE, because WHERE runs before rows are grouped. Test them in HAVING."
      : `Every column in SELECT must be in GROUP BY or inside a summary like SUM. ${quoted(m)} is neither.`,
  "42P20": () => "Window functions can't go in WHERE, because they're worked out after it. Number the rows in a WITH step, then filter in the main query.",
  "42702": (m) => `${quoted(m)} is in more than one table here. Say which one you mean, like o.id or c.id.`,
  "42883": (m) => `Postgres has no function or operator that fits here (${m}). The types may not match: text and numbers don't mix.`,
  "42704": (m) => (/^type /.test(m) ? `There's no type called ${quoted(m)}. Common ones: integer, numeric(10,2), text, date, boolean.` : `Postgres says: ${m}`),
  "42P07": (m) => `There's already a table called ${quoted(m)}.`,
  "42701": (m) => `There's already a column called ${quoted(m)}.`,
  "22012": () => "The query divided by zero. Postgres stops rather than guess.",
  "22P02": (m) => `${m.split(": ").pop()?.replace(/"/g, "") ?? "That value"} isn't a valid value for that column's type.`,
  "23505": (m) => `That would put a duplicate where values must be unique (${quoted(m)}).`,
  "23502": (m) =>
    /contains null values/.test(m)
      ? `${quoted(m)} can't be NOT NULL yet: the rows already in ${quoted(m, 1)} would have NULL in it. Give it a DEFAULT so they get a value.`
      : `${quoted(m)} can't be empty (NULL) in ${quoted(m, 1)}.`,
  "23503": (m) =>
    /^update or delete on/i.test(m)
      ? `Rows in ${quoted(m, 2)} still point at the ${quoted(m)} rows you're removing. Delete or change those first.`
      : `That ${quoted(m)} row would point at a row that doesn't exist (${quoted(m, 1)}).`,
  "23514": (m) => `That value breaks a rule on the table (${quoted(m, 1) || quoted(m)}).`,
  "2BP01": (m, detail) => {
    const what = /drop (?:table|view) (\S+)/.exec(m)?.[1] ?? "this table";
    const why = detail?.split("\n")[0]?.trim();
    return `Other things depend on ${what}${why ? ` (${why})` : ""}. Add CASCADE to drop them too, or drop them first.`;
  },
  "0A000": (m, detail) => {
    if (!/cannot truncate a table referenced/.test(m)) return `Postgres says: ${m}`;
    const [, from, to] = /Table "(.+?)" references "(.+?)"/.exec(detail ?? "") ?? [];
    return from && to
      ? `${from} points at ${to}, so ${to} can't be emptied on its own. Empty both in the same TRUNCATE, or add CASCADE.`
      : "Another table points at this one. Empty both in the same TRUNCATE, or add CASCADE.";
  },
  "21000": () => "A subquery returned more than one row where only one fits.",
  "42P10": () => "ORDER BY in a SELECT DISTINCT must use columns from the SELECT list.",
};

export function plainError(code: string | undefined, message: string, detail?: string): string {
  const rule = code ? RULES[code] : undefined;
  return rule ? rule(message, detail) : `Postgres says: ${message}`;
}
