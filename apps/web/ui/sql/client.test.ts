import { afterEach, describe, expect, it, vi } from "vitest";
import { SqlClient, type WorkerLike } from "./client";

type Msg = { id: number; op: string; sql?: string };

/** A stand-in worker: `answer` decides the reply to each message, or returns undefined to stay silent. */
function fakeWorkers(answer: (m: Msg, n: number) => unknown) {
  const made: (WorkerLike & { posted: Msg[]; terminated: boolean })[] = [];
  const make = () => {
    const n = made.length;
    const w = {
      posted: [] as Msg[],
      terminated: false,
      onmessage: null as ((e: MessageEvent) => void) | null,
      postMessage(m: Msg) {
        w.posted.push(m);
        const data = answer(m, n);
        if (data !== undefined) queueMicrotask(() => w.onmessage?.({ data: { id: m.id, ok: true, data } } as MessageEvent));
      },
      terminate() { w.terminated = true; },
    };
    made.push(w);
    return w;
  };
  return { make, made };
}

const result = { ok: true, result: { columns: ["n"], rows: [[1]] }, command: "SELECT", rowCount: 1, ms: 2 };

afterEach(() => { vi.useRealTimers(); });

describe("SqlClient", () => {
  it("warms the database before the first query", async () => {
    const { make, made } = fakeWorkers((m) => (m.op === "warm" ? true : result));
    const client = new SqlClient(make);
    expect(await client.run("SELECT 1")).toEqual(result);
    expect(made[0]!.posted.map((m) => m.op)).toEqual(["warm", "run"]);
  });

  it("restarts after a timeout", async () => {
    vi.useFakeTimers();
    const { make, made } = fakeWorkers((m, n) => (m.op === "warm" ? true : n === 0 ? undefined : result));
    const client = new SqlClient(make, 3000);
    const slow = client.run("SELECT count(*) FROM generate_series(1, 1e12)");
    await vi.advanceTimersByTimeAsync(3000);
    expect(await slow).toEqual({ ok: false, message: "That query took longer than 3 seconds, so it was stopped." });
    expect(made[0]!.terminated).toBe(true);
    const next = client.run("SELECT 1");
    await vi.advanceTimersByTimeAsync(10);
    expect(await next).toEqual(result);
    expect(made).toHaveLength(2);
  });

  it("sends one request at a time", async () => {
    const { make, made } = fakeWorkers((m) => (m.op === "warm" ? true : result));
    const client = new SqlClient(make);
    await Promise.all([client.run("SELECT 1"), client.replay("SELECT 2")]);
    expect(made[0]!.posted.map((m) => m.op)).toEqual(["warm", "run", "replay"]);
  });

  it("gives a replay longer than a run, and says the replay took too long", async () => {
    vi.useFakeTimers();
    const { make } = fakeWorkers((m) => (m.op === "warm" ? true : undefined));
    const client = new SqlClient(make, 3000);
    let done: unknown;
    void client.replay("SELECT 1").then((r) => (done = r));
    await vi.advanceTimersByTimeAsync(3000);
    expect(done).toBeUndefined();
    await vi.advanceTimersByTimeAsync(7000);
    expect(done).toEqual({ supported: false, reason: "The replay took too long to build, so here's just the result." });
  });

  it("gives each kind of request its own timeout answer", async () => {
    vi.useFakeTimers();
    const { make } = fakeWorkers((m) => (m.op === "warm" ? true : undefined));
    const client = new SqlClient(make, 3000);
    const check = client.check({ id: "t", prompt: "p", starter: "s", hint: "h", solution: "SELECT 1", ordered: false }, "SELECT 1");
    await vi.advanceTimersByTimeAsync(3000);
    expect((await check).feedback).toEqual({ ok: false, kind: "error", message: "That query took longer than 3 seconds, so it was stopped." });
  });
});
