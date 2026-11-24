// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Checked, Replay } from "@tintelix/sql";
import { vi } from "vitest";
import type { SqlClient } from "./client";
import { SqlLessonView } from "./SqlLessonView";

// CodeMirror needs a real browser; a textarea stands in.
vi.mock("./QueryEditor", () => ({
  QueryEditor: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => <textarea aria-label="SQL query" value={value} onChange={(e) => onChange(e.target.value)} />,
}));

const solved: Checked = { run: { ok: true, result: { columns: ["n"], rows: [[1]] }, command: "SELECT", rowCount: 1, ms: 1 }, feedback: { ok: true } };

/** A client whose start-up (the first replay) and checks finish only when the test says so. */
function fakeClient() {
  let boot!: (r: Replay) => void;
  const booting = new Promise<Replay>((resolve) => (boot = resolve));
  const checks: ((c: Checked) => void)[] = [];
  let first = true;
  const client = {
    replay: vi.fn(async (sql: string): Promise<Replay> => {
      if (first) { first = false; return booting; }
      return { supported: false, reason: `replayed: ${sql}` };
    }),
    check: vi.fn(() => new Promise<Checked>((resolve) => checks.push(resolve))),
    run: vi.fn(),
    dispose: vi.fn(),
  };
  return { client, boot, checks, make: () => client as unknown as SqlClient };
}

describe("SqlLessonView", () => {
  it("runs a query pressed during start-up once Postgres is ready", async () => {
    const f = fakeClient();
    render(<SqlLessonView slug="select" makeClient={f.make} />);
    await waitFor(() => expect(f.client.replay).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "Run" }));
    expect(f.client.check).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toBe("Starting Postgres in your browser… your query will run when it's ready.");
    await act(async () => f.boot({ supported: false, reason: "started" }));
    await waitFor(() => expect(f.client.check).toHaveBeenCalledTimes(1));
  });

  it("doesn't show an old task's result after switching tasks mid-run", async () => {
    const f = fakeClient();
    render(<SqlLessonView slug="select" makeClient={f.make} />);
    await waitFor(() => expect(f.client.replay).toHaveBeenCalledTimes(1));
    await act(async () => f.boot({ supported: false, reason: "started" }));
    fireEvent.click(screen.getByRole("button", { name: "Run" }));
    await waitFor(() => expect(f.client.check).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: /customer's name and city/ }));
    await act(async () => f.checks[0]!(solved));
    expect(screen.queryByText("Task solved")).toBeNull();
    await waitFor(() => expect(f.client.replay).toHaveBeenLastCalledWith("SELECT city, name\nFROM customers;"));
    expect(screen.getByText("replayed: SELECT city, name FROM customers;", { normalizer: (s) => s.replace(/\s+/g, " ") })).toBeTruthy();
  });
});
