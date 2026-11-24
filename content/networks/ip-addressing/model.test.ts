import { formatOutput } from "@tintelix/schema/format";
import { ipModel } from "./model";

const run = (extra: Record<string, number> = {}) => ipModel.run({ ...ipModel.defaults, ...extra }) as Record<string, number>;
const show = (extra: Record<string, number>, name: string) => formatOutput(name, run(extra)[name]!);

describe("IP addressing model", () => {
  it("a /24 has 24 network bits, 8 host bits, 256 addresses and 254 for devices", () => {
    const d = run();
    expect([d.networkBits, d.hostBits, d.addresses, d.hosts]).toEqual([24, 8, 256, 254]);
    expect(show({ prefixLen: 16 }, "addresses")).toBe("65,536");
    expect(show({ prefixLen: 30 }, "hosts")).toBe("2");
  });

  it("IPv4 has 4.3 billion addresses, about half one per person", () => {
    expect(show({}, "ipv4B")).toBe("4.3");
    expect(show({}, "v4PerPerson")).toBe("0.5");
  });

  it("the three private ranges hold about 18 million addresses", () => {
    expect(run().privateAddrs).toBe(16_777_216 + 1_048_576 + 65_536);
    expect(show({}, "privateM")).toBe("18");
  });

  it("IPv6 has 3.4 × 10^38 addresses, about 10^28 per person", () => {
    expect(show({}, "ipv6Mant")).toBe("3.4");
    expect(run().ipv6Exp).toBe(38);
    expect(run().v6PerPersonExp).toBe(28);
  });

  it("feeds the bits widget the laptop's address, and IPv6 in the last mode", () => {
    expect([run().ipA, run().ipB, run().ipC, run().ipD]).toEqual([192, 168, 1, 42]);
    expect(run({ mode: 3 }).v6).toBe(0);
    expect(run({ mode: 4 }).v6).toBe(1);
  });

  it("keeps bad inputs in range", () => {
    expect(run({ prefixLen: 2 }).prefixLen).toBe(8);
    expect(run({ prefixLen: 40 }).prefixLen).toBe(30);
    expect(run({ prefixLen: Number.NaN }).prefixLen).toBe(24);
  });
});
