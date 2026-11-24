import { formatOutput } from "@tintelix/schema/format";
import { mqModel } from "./model";

const run = (extra: Record<string, number> = {}) => mqModel.run({ ...mqModel.defaults, ...extra }) as Record<string, number>;
const show = (extra: Record<string, number>, name: string) => formatOutput(name, run(extra)[name]!);

describe("distributed message queue model", () => {
  it("2 million messages a second is 2 GB a second in", () => {
    expect(show({}, "msgRate")).toBe("2,000,000");
    expect(show({}, "ingressGBs")).toBe("2");
  });

  it("one broker copes at launch and drowns at full size", () => {
    expect(show({ mode: 1 }, "brokerBusyPct")).toBe("2%");
    expect(show({ mode: 2 }, "brokerBusyPct")).toBe("400%");
    expect(show({ mode: 2 }, "brokerFailPct")).toBe("75%");
  });

  it("a partitioned log over 24 brokers, then three copies of every partition", () => {
    expect(show({ mode: 3 }, "brokerBusyPct")).toBe("17%");
    expect(show({ mode: 3 }, "retainedPb")).toBe("1.2");
    expect(show({ mode: 4 }, "brokerBusyPct")).toBe("50%");
    expect(show({ mode: 4 }, "retainedPb")).toBe("3.6");
  });

  it("partitions cap a group's parallelism", () => {
    expect(show({ mode: 5 }, "activeConsumers")).toBe("400");
    expect(show({ mode: 5 }, "lagGrowth")).toBe("0");
    expect(show({ mode: 5, consumers: 600 }, "idleConsumers")).toBe("200");
    expect(show({ mode: 5, consumers: 200 }, "consumeRate")).toBe("1,000,000");
    expect(show({ mode: 5, consumers: 200 }, "lagGrowth")).toBe("1,000,000");
    expect(show({ mode: 5 }, "groups")).toBe("2");
    expect(show({ mode: 4 }, "groups")).toBe("1");
  });

  it("guards against nonsense inputs", () => {
    const out = run({ msgRate: -1, brokerMBs: 0, brokers: 0, rf: 0, partitions: 0, consumers: Number.NaN });
    for (const v of Object.values(out)) expect(Number.isFinite(v)).toBe(true);
  });
});
