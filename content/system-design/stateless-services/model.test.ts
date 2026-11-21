import { formatOutput } from "@tintelix/schema/format";
import { sessionModel } from "./model";

const run = (extra: Record<string, number>) => sessionModel.run({ ...sessionModel.defaults, ...extra }) as Record<string, number>;
const show = (extra: Record<string, number>, name: string) => formatOutput(name, run(extra)[name]!);

describe("session model", () => {
  it("sessions in memory with round robin: most requests miss their session", () => {
    expect(run({}).perServer).toBe(5000);
    expect(show({}, "lostPct")).toBe("67%");
    expect(show({}, "bouncedPct")).toBe("67%");
  });

  it("sticky sessions keep every request on its own server", () => {
    expect(show({ mode: 1 }, "lostPct")).toBe("0%");
  });

  it("a deploy logs out one server's users, in a burst that looks like an attack", () => {
    const o = run({ mode: 1, deploy: 1 });
    expect(o.loggedOut).toBe(5000);
    expect(show({ mode: 1, deploy: 1 }, "loginSpike")).toBe("2,500");
    expect(show({ mode: 1, deploy: 1, elapsedSec: 1 }, "bouncedPct")).toBe("33%");
    expect(show({ mode: 1, deploy: 1 }, "bouncedPct")).toBe("0%");
  });

  it("a shared store: nobody logged out, for one more hop per request", () => {
    const o = run({ mode: 2, deploy: 1 });
    expect(o.loggedOut).toBe(0);
    expect(show({ mode: 2, deploy: 1 }, "requestMs")).toBe("151 ms");
    expect(show({ mode: 2, deploy: 1 }, "addedPct")).toBe("0.67%");
    expect(show({ mode: 2, baseMs: 8 }, "addedPct")).toBe("13%");
    expect(show({ mode: 2 }, "storeOps")).toBe("6,000");
    expect(run({ mode: 1 }).storeOps).toBe(0);
  });
});
