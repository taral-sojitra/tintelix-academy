import { formatOutput } from "@tintelix/schema/format";
import { leaderModel } from "./model";

const run = (extra: Record<string, number>) => leaderModel.run({ ...leaderModel.defaults, ...extra }) as Record<string, number>;
const show = (extra: Record<string, number>, name: string) => formatOutput(name, run(extra)[name]!);

describe("leader election model", () => {
  it("a majority of 5 is 3, so 2 can fail (§78.4); heartbeats every 100 ms (§6.3)", () => {
    expect(show({}, "majority")).toBe("3");
    expect(show({}, "canLose")).toBe("2");
    expect(show({}, "heartbeatRate")).toBe("40");
    expect(run({})).toMatchObject({ leader: 1, term: 33, n1State: 0 });
  });

  it("the leader dies: followers wait the timeout, then n2 wins term 34", () => {
    const at = (t: number) => run({ mode: 1, elapsedSec: t });
    expect(at(0.5)).toMatchObject({ leader: 1, term: 33, phase: 0 });
    expect(at(1.5)).toMatchObject({ leader: 0, n1State: 1, phase: 1, timerPct: 0.5 });
    expect(at(2.2)).toMatchObject({ leader: 0, candidate: 2, term: 34, phase: 2 });
    expect(at(4)).toMatchObject({ leader: 2, candidate: 0, term: 34, votes: 4, phase: 3 });
    expect(show({ mode: 1 }, "failoverMs")).toBe("1010 ms");
    expect(show({ mode: 1 }, "waitingWrites")).toBe("2,020");
  });

  it("a shorter timeout fails over faster but blips trigger needless elections", () => {
    expect(show({}, "falseElections")).toBe("4");
    expect(show({ electionTimeoutMs: 300 }, "failoverMs")).toBe("310 ms");
    expect(show({ electionTimeoutMs: 300 }, "falseElections")).toBe("60");
    expect(show({ electionTimeoutMs: 3000 }, "falseElections")).toBe("0");
    expect(run({ mode: 1, electionTimeoutMs: 3000, elapsedSec: 3.5 })).toMatchObject({ leader: 0, phase: 1 });
  });

  it("a 3–2 partition: only the majority side elects; the minority commits nothing", () => {
    const late = run({ mode: 2, elapsedSec: 5 });
    expect(late).toMatchObject({ leader: 2, term: 34, votes: 3, n1State: 2, majoritySize: 3, minoritySize: 2, minorityCommitPct: 0, majorityCommitPct: 100 });
    expect(run({ mode: 2, elapsedSec: 1.5 })).toMatchObject({ leader: 0, n1State: 2, majorityCommitPct: 0 });
  });

  it("fencing: n1 freezes, n2 writes token 34, n1 wakes and its token 33 is rejected (§78.3)", () => {
    const at = (t: number) => run({ mode: 3, elapsedSec: t });
    expect(at(0.5)).toMatchObject({ leader: 1, storageToken: 33, staleRejected: 0, n1State: 0 });
    expect(at(2)).toMatchObject({ leader: 0, n1State: 3, storageToken: 33 });
    expect(at(4)).toMatchObject({ leader: 2, storageToken: 34, staleRejected: 0, n1State: 3 });
    expect(at(6.5)).toMatchObject({ leader: 2, storageToken: 34, staleRejected: 1, n1State: 4, phase: 4 });
  });

  it("writes are accepted only while some leader can take them", () => {
    const at = (mode: number, t: number) => run({ mode, elapsedSec: t }).commitPct;
    expect([at(0, 5), at(1, 0.5), at(1, 1.5), at(1, 2.5), at(1, 4)]).toEqual([100, 100, 0, 0, 100]);
    expect([at(2, 1.5), at(2, 4)]).toEqual([0, 100]);
    expect([at(3, 2), at(3, 4), at(3, 7)]).toEqual([0, 100, 100]);
    expect(show({ mode: 1, elapsedSec: 1.5 }, "acceptedRate")).toBe("0");
    expect(show({ mode: 1, elapsedSec: 4 }, "acceptedRate")).toBe("2,000");
  });

  it("a pause shorter than the timeout goes unnoticed", () => {
    expect(run({ mode: 3, pauseSec: 0.5, elapsedSec: 4 })).toMatchObject({ leader: 1, n1State: 0, storageToken: 33, staleRejected: 0 });
  });
});
