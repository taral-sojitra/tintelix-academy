import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { openStore } from "./index";

const fresh = () => openStore(new IDBFactory());

describe("openStore", () => {
  it("saves a step and reads it back", async () => {
    const s = fresh();
    await s.saveStep("caching", 2, 6);
    expect(await s.getProgress("caching")).toMatchObject({ lessonId: "caching", lastStep: 2, furthestStep: 2, done: false });
  });

  it("never lowers the furthest step", async () => {
    const s = fresh();
    await s.saveStep("caching", 4, 6);
    await s.saveStep("caching", 1, 6);
    expect(await s.getProgress("caching")).toMatchObject({ lastStep: 1, furthestStep: 4 });
  });

  it("marks a lesson done on its last step, and keeps it done", async () => {
    const s = fresh();
    await s.saveStep("caching", 5, 6);
    await s.saveStep("caching", 0, 6);
    expect((await s.getProgress("caching"))?.done).toBe(true);
  });

  it("lists every lesson's progress", async () => {
    const s = fresh();
    await s.saveStep("caching", 1, 6);
    await s.saveStep("cdn", 0, 5);
    expect((await s.allProgress()).map((p) => p.lessonId).sort()).toEqual(["caching", "cdn"]);
  });

  it("returns null for a lesson never opened", async () => {
    expect(await fresh().getProgress("nope")).toBeNull();
  });

  it("round-trips prefs and falls back when unset", async () => {
    const s = fresh();
    expect(await s.getPref("theme", "warm")).toBe("warm");
    await s.setPref("theme", "blueprint");
    expect(await s.getPref("theme", "warm")).toBe("blueprint");
  });

  it("keeps working when IndexedDB is missing", async () => {
    const s = openStore(null);
    await expect(s.saveStep("caching", 1, 6)).resolves.toBeUndefined();
    await expect(s.setPref("theme", "x")).resolves.toBeUndefined();
    expect(await s.getProgress("caching")).toBeNull();
    expect(await s.allProgress()).toEqual([]);
    expect(await s.getPref("theme", "warm")).toBe("warm");
  });

  it("keeps working when opening the database throws", async () => {
    const broken = { open: () => { throw new DOMException("blocked", "SecurityError"); } } as unknown as IDBFactory;
    const s = openStore(broken);
    await expect(s.saveStep("caching", 1, 6)).resolves.toBeUndefined();
    expect(await s.getProgress("caching")).toBeNull();
    expect(await s.getPref("theme", "warm")).toBe("warm");
  });

  it("keeps working when even reading the indexedDB global throws (Firefox with storage blocked)", async () => {
    const saved = Object.getOwnPropertyDescriptor(globalThis, "indexedDB");
    Object.defineProperty(globalThis, "indexedDB", {
      configurable: true,
      get() {
        throw new DOMException("The operation is insecure.", "SecurityError");
      },
    });
    try {
      const s = openStore();
      await expect(s.saveStep("caching", 1, 6)).resolves.toBeUndefined();
      expect(await s.getProgress("caching")).toBeNull();
    } finally {
      if (saved) Object.defineProperty(globalThis, "indexedDB", saved);
    }
  });

  it("gives up on a database that never opens, so the lesson can still start", { timeout: 1000 }, async () => {
    const NeverOpens = (globalThis as unknown as { IDBOpenDBRequest: new () => IDBOpenDBRequest }).IDBOpenDBRequest;
    const hung = { open: () => new NeverOpens() } as unknown as IDBFactory;
    const s = openStore(hung, { openTimeoutMs: 20 });
    expect(await s.getProgress("caching")).toBeNull();
    await expect(s.saveStep("caching", 1, 6)).resolves.toBeUndefined();
  });

  it("closes its connection when a newer version of the site upgrades the database", async () => {
    const factory = new IDBFactory();
    const s = openStore(factory);
    await s.saveStep("caching", 1, 6);
    const outcome = await new Promise<string>((resolve) => {
      const req = factory.open("tintelix", 2);
      req.onblocked = () => resolve("blocked");
      req.onsuccess = () => {
        req.result.close();
        resolve("upgraded");
      };
    });
    expect(outcome).toBe("upgraded");
  });
});
