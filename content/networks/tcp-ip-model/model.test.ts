import { formatOutput } from "@tintelix/schema/format";
import { tcpIpModel } from "./model";

const run = (extra: Record<string, number> = {}) => tcpIpModel.run({ ...tcpIpModel.defaults, ...extra }) as Record<string, number>;
const show = (extra: Record<string, number>, name: string) => formatOutput(name, run(extra)[name]!);

describe("TCP/IP model lesson model", () => {
  it("12 routers mean 13 links, 13 Ethernet headers and a TTL down by 12", () => {
    const d = run();
    expect(d.hops).toBe(12);
    expect(d.links).toBe(13);
    expect(d.linkWrites).toBe(13);
    expect(d.ttlLeft).toBe(52);
    expect(d.endReads).toBe(2);
  });

  it("counts which layer each box runs: 4 at each end, 2 at each router", () => {
    expect(run().layerVisits).toBe(8 + 12 * 2);
    expect(show({ hops: 30 }, "layerVisits")).toBe("68");
  });

  it("a packet with too many hops for its TTL is dropped", () => {
    expect(run({ hops: 70 }).ttlLeft).toBe(0);
    expect(run({ hops: 70 }).droppedPct).toBe(100);
    expect(run({ hops: 63 }).droppedPct).toBe(0);
  });

  it("keeps bad inputs in range", () => {
    expect(run({ hops: Number.NaN }).hops).toBe(12);
    expect(run({ hops: -3 }).hops).toBe(0);
    expect(run({ mode: 9 }).mode).toBe(2);
  });
});
