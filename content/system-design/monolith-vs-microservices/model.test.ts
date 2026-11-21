import { formatOutput } from "@tintelix/schema/format";
import { microModel } from "./model";

const run = (extra: Record<string, number>) => microModel.run({ ...microModel.defaults, ...extra }) as Record<string, number>;
const show = (extra: Record<string, number>, name: string) => formatOutput(name, run(extra)[name]!);

describe("monolith vs microservices model", () => {
  it("a monolith: one deploy line for every team", () => {
    expect(show({}, "deploysPerDay")).toBe("16");
    expect(show({}, "deployLineHours")).toBe("12");
    expect(show({}, "callUs")).toBe("4");
    expect(show({}, "checkoutAvail")).toBe("99.9%");
  });

  it("microservices: teams deploy alone, but every call crosses the network", () => {
    expect(show({ mode: 1 }, "deployLineHours")).toBe("0");
    expect(show({ mode: 1 }, "teamDeployMin")).toBe("15");
    expect(show({ mode: 1 }, "callUs")).toBe("4,000");
    expect(show({ mode: 1 }, "checkoutAvail")).toBe("99.5%");
    expect(show({ mode: 1 }, "checkoutDowntime")).toBe("3 h 36 min");
    expect(show({}, "checkoutDowntime")).toBe("43.2 min");
  });

  it("scaling one hot part", () => {
    expect(show({}, "monoScaleGb")).toBe("40");
    expect(show({}, "microScaleGb")).toBe("10");
  });
});
