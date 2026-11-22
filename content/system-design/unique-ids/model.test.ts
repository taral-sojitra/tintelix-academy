import { formatOutput } from "@tintelix/schema/format";
import { idsModel } from "./model";

const run = (extra: Record<string, number> = {}) => idsModel.run({ ...idsModel.defaults, ...extra }) as Record<string, number>;
const show = (extra: Record<string, number>, name: string) => formatOutput(name, run(extra)[name]!);

describe("unique ID generator model", () => {
  it("50 servers at 2,000 IDs a second need 100,000 a second", () => {
    expect(show({}, "fullIdRate")).toBe("100,000");
    expect(show({ mode: 0 }, "idRate")).toBe("4,000");
  });

  it("one shared counter copes at launch and drowns at full traffic", () => {
    expect(show({ mode: 0 }, "counterBusyPct")).toBe("80%");
    expect(show({ mode: 1 }, "counterBusyPct")).toBe("2,000%");
    expect(show({ mode: 1 }, "counterFailPct")).toBe("95%");
    expect(show({ mode: 2 }, "counterBusyPct")).toBe("0%");
  });

  it("random UUIDs need no counter but take 128 bits and lose time order", () => {
    expect(show({ mode: 2 }, "idBits")).toBe("128");
    expect(show({ mode: 2 }, "timeOrdered")).toBe("0");
    expect(show({ mode: 3 }, "idBits")).toBe("64");
    expect(show({ mode: 3 }, "timeOrdered")).toBe("1");
  });

  it("41 bits of time, 10 of machine and 12 of sequence", () => {
    expect(show({ mode: 3 }, "seqBits")).toBe("12");
    expect(show({ mode: 3 }, "machines")).toBe("1,024");
    expect(show({ mode: 3 }, "idsPerMilli")).toBe("4,096");
    expect(show({ mode: 3 }, "perMachineRate")).toBe("4,096,000");
    expect(show({ mode: 3 }, "headroomX")).toBe("2,048");
    expect(show({ mode: 3 }, "timeYears")).toBe("70");
    expect(show({ mode: 3 }, "fitsMachines")).toBe("1");
  });

  it("too few machine bits can't number every server", () => {
    expect(show({ mode: 3, machineBits: 5 }, "machines")).toBe("32");
    expect(show({ mode: 3, machineBits: 5 }, "fitsMachines")).toBe("0");
    expect(show({ mode: 3, machineBits: 16 }, "perMachineRate")).toBe("64,000");
  });

  it("a clock that jumps back makes the generator wait, not repeat", () => {
    expect(show({ mode: 4 }, "clockBackMs")).toBe("5 ms");
    expect(show({ mode: 4 }, "heldIds")).toBe("10");
    expect(show({ mode: 3 }, "clockBackMs")).toBe("0 ms");
  });

  it("guards against nonsense inputs", () => {
    const out = run({ servers: -3, perServerRate: Number.NaN, machineBits: 40, counterCapacity: 0 });
    for (const v of Object.values(out)) expect(Number.isFinite(v)).toBe(true);
  });
});
