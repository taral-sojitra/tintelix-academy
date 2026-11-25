/** A listing with its site markers taken out: what the code panel shows and which lines each site lights. */
export interface Listing {
  code: string;
  lines: string[];
  /** Site → 1-based line numbers. */
  sites: Record<string, number[]>;
  /** Lines specific to this problem, highlighted against the pattern's standard code on the cheatsheet. */
  changed: number[];
}

/** A trailing comment made only of `@name` markers: `// @check @changed` or `# @none`. */
const MARKERS = { ts: /\s*\/\/((?:\s*@[a-z0-9-]+)+)\s*$/, py: /\s*#((?:\s*@[a-z0-9-]+)+)\s*$/ } as const;

/** Reads `// @site` (TypeScript) or `# @site` (Python) markers at line ends; `@changed` marks a problem-specific line. */
export function parseListing(src: string, lang: "ts" | "py"): Listing {
  const sites: Record<string, number[]> = {};
  const changed: number[] = [];
  const lines = src.split("\n").map((line, i) => {
    const m = MARKERS[lang].exec(line);
    if (!m) return line.trimEnd();
    for (const name of m[1]!.trim().split(/\s+/).map((s) => s.slice(1))) {
      if (name === "changed") changed.push(i + 1);
      else (sites[name] ??= []).push(i + 1);
    }
    return line.slice(0, m.index).trimEnd();
  });
  return { code: lines.join("\n"), lines, sites, changed };
}

/** Every site named by a `t.at("…")` call in an algorithm's source, in order, without repeats. */
export function siteLiterals(algoSource: string): string[] {
  const out: string[] = [];
  for (const m of algoSource.matchAll(/\bt\.at\(\s*(["'`])([a-z0-9-]+)\1/g)) if (!out.includes(m[2]!)) out.push(m[2]!);
  return out;
}
