import { formatOutput } from "@tintelix/schema/format";
import { replModel } from "./model";

const run = (extra: Record<string, number>) => replModel.run({ ...replModel.defaults, ...extra }) as Record<string, number>;
const show = (extra: Record<string, number>, name: string) => formatOutput(name, run(extra)[name]!);

describe("replication model", () => {
  it("replicas share the reads; every write still goes to the primary", () => {
    expect(show({}, "perReplicaReads")).toBe("4,500");
    expect(show({}, "replicaBusyPct")).toBe("90%");
    expect(show({ replicas: 3 }, "perReplicaReads")).toBe("3,000");
    expect(show({}, "primaryBusyPct")).toBe("20%");
    expect(show({ replicas: 3 }, "primaryBusyPct")).toBe("20%");
  });

  it("asynchronous lag makes read-backs stale", () => {
    expect(show({}, "staleBackPct")).toBe("45%");
    expect(show({}, "staleBackRps")).toBe("450");
    expect(show({ lagMs: 300 }, "staleBackPct")).toBe("100%");
  });

  it("reading your own writes from the primary: none stale, the primary does more", () => {
    expect(show({ readBack: 1 }, "staleBackPct")).toBe("0%");
    expect(show({ readBack: 1 }, "primaryBusyPct")).toBe("40%");
    expect(show({ readBack: 1 }, "perReplicaReads")).toBe("4,000");
  });

  it("a crash loses the writes still in flight, and writes fail until a replica is promoted", () => {
    expect(show({ crash: 1 }, "lostWrites")).toBe("90");
    expect(show({ crash: 1, elapsedSec: 4 }, "writesDownPct")).toBe("100%");
    expect(show({ crash: 1 }, "writesDownPct")).toBe("0%");
    expect(show({ crash: 1, sync: 1 }, "lostWrites")).toBe("0");
    expect(show({}, "syncWriteMs")).toBe("62 ms");
    expect(show({}, "commitMs")).toBe("2 ms");
  });

  it("a promoted replica stops serving reads, so the others take its share", () => {
    expect(show({ crash: 1, readBack: 1, replicas: 3, elapsedSec: 4 }, "perReplicaReads")).toBe("2,667");
    expect(show({ crash: 1, readBack: 1, replicas: 3 }, "perReplicaReads")).toBe("4,000");
    expect(show({ crash: 1, readBack: 1, replicas: 2 }, "perReplicaReads")).toBe("8,000");
  });
});
