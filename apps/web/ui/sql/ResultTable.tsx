import type { Mark } from "@tintelix/sql";

/** One value as Postgres would show it; NULL is marked so it can't be mistaken for the text "NULL". */
export function Cell({ value }: { value: unknown }) {
  if (value === null || value === undefined) return <span className="null">NULL</span>;
  if (value instanceof Date) {
    const iso = value.toISOString();
    return <>{iso.endsWith("T00:00:00.000Z") ? iso.slice(0, 10) : iso.replace("T", " ").slice(0, 19)}</>;
  }
  if (typeof value === "object") return <>{JSON.stringify(value)}</>;
  return <>{String(value)}</>;
}

interface Props {
  columns: string[];
  rows: unknown[][];
  /** The full row count, when `rows` is only the first part. */
  total?: number;
  marks?: Mark[];
  groups?: number[];
  /** Where each row should be, for a result in the wrong order. */
  ranks?: number[];
  max?: number;
  caption?: string;
}

function rowClass(i: number, marks?: Mark[], groups?: number[]): string {
  if (marks?.[i]) return `m-${marks[i]}`;
  if (groups && groups[i] !== undefined) return `g-${groups[i]! % 6}${i === 0 || groups[i - 1] !== groups[i] ? " g-start" : ""}`;
  return "";
}

export function ResultTable({ columns, rows, total = rows.length, marks, groups, ranks, max = 200, caption }: Props) {
  const shown = rows.slice(0, max);
  const more = total - shown.length;
  return (
    <div className="sql-table-wrap">
      <table className="sql-table">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr>
            {ranks && <th scope="col">Should be</th>}
            {columns.map((c, i) => (
              <th key={i} scope="col">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {shown.map((row, i) => (
            <tr key={i} className={rowClass(i, marks, groups)}>
              {ranks && <td className="rank">#{ranks[i]}</td>}
              {row.map((v, j) => (
                <td key={j}>
                  <Cell value={v} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {more > 0 && <p className="sql-more">…and {more} more {more === 1 ? "row" : "rows"}</p>}
      {total === 0 && <p className="sql-more">No rows.</p>}
    </div>
  );
}
