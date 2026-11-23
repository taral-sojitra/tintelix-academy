import { formatOutput } from "@tintelix/schema/format";
import { chatModel } from "./model";

const run = (extra: Record<string, number> = {}) => chatModel.run({ ...chatModel.defaults, ...extra }) as Record<string, number>;
const show = (extra: Record<string, number>, name: string) => formatOutput(name, run(extra)[name]!);

describe("chat app model (book chapter 127's numbers)", () => {
  it("100 billion sends a day become 220 billion deliveries", () => {
    expect(show({}, "sendsB")).toBe("100");
    expect(show({}, "deliveriesB")).toBe("220");
    expect(show({}, "deliveryRateM")).toBe("2.5");
    expect(show({}, "deliveryPeakM")).toBe("13");
    expect(show({}, "groupDeliveryPct")).toBe("61%");
    expect(show({}, "storageTbDay")).toBe("20");
  });

  it("polling every few seconds is mostly empty and still slow", () => {
    expect(show({ mode: 1 }, "pollRateM")).toBe("125");
    expect(show({ mode: 1 }, "emptyPollPct")).toBe("98%");
    expect(show({ mode: 1 }, "pollWaitSec")).toBe("4 s");
    expect(show({ mode: 1, pollInterval: 1 }, "pollRateM")).toBe("500");
    expect(show({ mode: 1, pollInterval: 20 }, "emptyPollPct")).toBe("90%");
  });

  it("persistent connections: a thousand chat servers, heartbeats for presence", () => {
    expect(show({ mode: 2 }, "chatServers")).toBe("1,000");
    expect(show({ mode: 5 }, "heartbeatRateM")).toBe("17");
  });

  it("guards against nonsense inputs", () => {
    const out = run({ sendsPerDay: -1, pollInterval: 0, connsPerServer: 0, groupSize: Number.NaN });
    for (const v of Object.values(out)) expect(Number.isFinite(v)).toBe(true);
  });
});
