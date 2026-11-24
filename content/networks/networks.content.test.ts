import { describe, expect, it } from "vitest";
import { getSubject, lessonSummaries, subjects } from "../index";

describe("the Networks subject", () => {
  it("lists 20 lessons in the HLD's six modules", () => {
    expect(getSubject("networks")!.modules.map((m) => m.title)).toEqual(["Models", "Addressing", "Transport", "Application", "Moving packets", "Performance"]);
    expect(lessonSummaries("networks")).toHaveLength(20);
  });

  it("links its own lessons under /networks and the shared one to System Design", () => {
    const all = lessonSummaries("networks");
    expect(all[0]).toMatchObject({ id: "net-osi-model", href: "/networks/osi-model", home: "networks" });
    expect(all.find((l) => l.slug === "load-balancing")).toMatchObject({ id: "load-balancing", href: "/system-design/load-balancing", home: "system-design", available: true });
  });

  it("only builds on lessons that come earlier, or on another subject's lessons", () => {
    const order = lessonSummaries("networks").map((l) => l.id);
    const everywhere = new Set(subjects.flatMap((s) => lessonSummaries(s.id).map((l) => l.id)));
    for (const stub of getSubject("networks")!.modules.flatMap((m) => m.lessons)) {
      for (const b of stub.buildsOn) {
        if (b.startsWith("net-")) expect(order.indexOf(b), `${stub.id} builds on ${b}`).toBeLessThan(order.indexOf(stub.id));
        else expect(everywhere.has(b), `${stub.id} builds on ${b}`).toBe(true);
      }
    }
  });

  it("counts a shared lesson once across subjects, in its home subject", () => {
    const own = subjects.flatMap((s) => lessonSummaries(s.id).filter((l) => l.home === s.id).map((l) => l.id));
    expect(new Set(own).size).toBe(own.length);
    expect(own.filter((id) => id === "load-balancing")).toHaveLength(1);
  });
});
