import { formatOutput } from "@tintelix/schema/format";
import { hotelModel } from "./model";

const run = (extra: Record<string, number> = {}) => hotelModel.run({ ...hotelModel.defaults, ...extra }) as Record<string, number>;
const show = (extra: Record<string, number>, name: string) => formatOutput(name, run(extra)[name]!);

describe("hotel booking model (book chapter 134's numbers)", () => {
  it("4 million rooms; 50 searches for every booking", () => {
    expect(show({}, "roomsM")).toBe("4");
    expect(show({}, "bookingsPerDay")).toBe("400,000");
    expect(show({}, "bookAvg")).toBe("4.6");
    expect(show({}, "searchAvg")).toBe("231");
    expect(show({}, "searchPeak")).toBe("926");
    expect(show({}, "bookPeak")).toBe("19");
  });

  it("check-then-insert sells rooms twice once bookings race", () => {
    expect(show({ mode: 2 }, "doubleBookings")).toBe("800");
    expect(show({ mode: 2 }, "racePct")).toBe("50%");
    expect(show({ mode: 3 }, "doubleBookings")).toBe("0");
    expect(show({ mode: 3 }, "racePct")).toBe("0%");
  });

  it("holds during payment tie up a sliver of the rooms", () => {
    expect(show({}, "holdsPeak")).toBe("37");
    expect(show({}, "heldRooms")).toBe("22,222");
    expect(show({}, "heldPct")).toBe("0.56%");
    expect(show({ holdMin: 30 }, "heldRooms")).toBe("66,667");
  });

  it("search from a cache leaves the database 46 reads a second", () => {
    expect(show({ mode: 5 }, "searchDbReads")).toBe("46");
    expect(show({ mode: 4 }, "searchDbReads")).toBe("926");
  });

  it("guards against nonsense inputs", () => {
    const out = run({ properties: -1, conversion: 0, checkoutPct: 0, holdMin: Number.NaN });
    for (const v of Object.values(out)) expect(Number.isFinite(v)).toBe(true);
  });
});
