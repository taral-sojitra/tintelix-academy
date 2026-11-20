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
});
