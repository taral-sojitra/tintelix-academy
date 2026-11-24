import type { SqlTask } from "@tintelix/schema";
import type { Checked, Replay, RunOutcome } from "@tintelix/sql";

/** The part of a Worker the client uses, so tests can stand in for it. */
export interface WorkerLike {
  onmessage: ((e: MessageEvent) => void) | null;
  onerror?: ((e: unknown) => void) | null;
  postMessage(message: unknown): void;
  terminate(): void;
}

type Reply = { ok: boolean; data?: unknown; error?: string };

/**
 * Talks to the PGlite worker. Requests go one at a time (each run is its own BEGIN … ROLLBACK on one
 * connection). A request over `timeoutMs` stops the worker; the next request starts a fresh one.
 */
export class SqlClient {
  private worker: WorkerLike | null = null;
  private warm: Promise<Reply> | null = null;
  private nextId = 1;
  private pending = new Map<number, (r: Reply) => void>();
  private queue: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly make: () => WorkerLike,
    private readonly timeoutMs = 3000,
    private readonly bootMs = 60000,
  ) {}

  private get timeoutMessage() {
    return `That query took longer than ${this.timeoutMs / 1000} seconds, so it was stopped.`;
  }

  private why(r: Reply): string {
    if (r.error === "timeout") return this.timeoutMessage;
    if (r.error === "boot") return "The practice database couldn't start. Reload the page to try again.";
    return `Something went wrong running that: ${r.error}`;
  }

  private start() {
    const w = this.make();
    w.onmessage = (e) => {
      const reply = e.data as Reply & { id: number };
      const done = this.pending.get(reply.id);
      if (done) { this.pending.delete(reply.id); done(reply); }
    };
    w.onerror = () => this.stop("boot");
    this.worker = w;
    this.warm = this.send("warm", {}, this.bootMs);
  }

  private send(op: string, body: object, ms: number): Promise<Reply> {
    const w = this.worker!;
    const id = this.nextId++;
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        this.stop("restarted");
        resolve({ ok: false, error: "timeout" });
      }, ms);
      this.pending.set(id, (r) => { clearTimeout(timer); resolve(r); });
      w.postMessage({ id, op, ...body });
    });
  }

  private stop(error: string) {
    this.worker?.terminate();
    this.worker = null;
    this.warm = null;
    const waiting = [...this.pending.values()];
    this.pending.clear();
    for (const done of waiting) done({ ok: false, error });
  }

  private call(op: string, body: object): Promise<Reply> {
    const job = this.queue.then(async (): Promise<Reply> => {
      if (!this.worker) this.start();
      const warmed = await this.warm!;
      if (!warmed.ok) { this.stop("boot"); return { ok: false, error: "boot" }; }
      return this.send(op, body, this.timeoutMs);
    });
    this.queue = job.catch(() => undefined);
    return job;
  }

  async run(sql: string): Promise<RunOutcome> {
    const r = await this.call("run", { sql });
    return r.ok ? (r.data as RunOutcome) : { ok: false, message: this.why(r) };
  }

  async check(task: SqlTask, sql: string): Promise<Checked> {
    const r = await this.call("check", { sql, task });
    if (r.ok) return r.data as Checked;
    const message = this.why(r);
    return { run: { ok: false, message }, feedback: { ok: false, kind: "error", message } };
  }

  async replay(sql: string): Promise<Replay> {
    const r = await this.call("replay", { sql });
    return r.ok ? (r.data as Replay) : { supported: false, reason: this.why(r) };
  }

  dispose() {
    this.stop("restarted");
  }
}
