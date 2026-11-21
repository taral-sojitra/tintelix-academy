import { formatOutput } from "@tintelix/schema/format";
import { consistencyModel } from "./model";

const run = (extra: Record<string, number>) => consistencyModel.run({ ...consistencyModel.defaults, ...extra }) as Record<string, number>;
const show = (extra: Record<string, number>, name: string) => formatOutput(name, run(extra)[name]!);

describe("consistency models", () => {
  it("eventual: Asha misses her own post, Ben sees a reply to nothing", () => {
    const o = run({});
    expect(o.ashaSees).toBe(0);
    expect(o.benPost).toBe(0);
    expect(o.benReply).toBe(1);
    expect(o.anomaly).toBe(1);
    expect(show({}, "convergeMs")).toBe("300 ms");
    expect(show({}, "readMs")).toBe("1 ms");
  });

  it("read your writes: Asha sees her post; Ben's view is still broken", () => {
    const o = run({ mode: 1 });
    expect(o.ashaSees).toBe(1);
    expect(o.anomaly).toBe(1);
  });

  it("causal: the reply waits for the post it answers", () => {
    const o = run({ mode: 2 });
    expect(o.ashaSees).toBe(1);
    expect(o.benReply).toBe(0);
    expect(o.anomaly).toBe(0);
    expect(o.replyVisible2).toBe(300);
  });

  it("strong: every read sees the latest write, at the price of a long read", () => {
    const o = run({ mode: 3 });
    expect([o.ashaSees, o.benPost, o.benReply, o.anomaly]).toEqual([1, 1, 1, 0]);
    expect(show({ mode: 3 }, "readMs")).toBe("70 ms");
  });
});
