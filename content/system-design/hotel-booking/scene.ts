import type { SceneSpec } from "@tintelix/schema";

type Hop = [string, 1 | -1, string];
const path = (...hops: Hop[]) => hops.map(([wire, dir, at]) => ({ wire, dir, at }));

/**
 * Guests search along the top and book along the bottom; both reach the reservations database. An
 * availability cache appears in front of search later; the race panel sits on the right.
 */
export const hotelScene: SceneSpec = {
  kind: "board",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 28, w: 984, h: 418 },
  nodes: {
    guests: { x: 16, y: 190, w: 150, h: 84, kind: "users", label: "Guests", sub: "search, book" },
    search: { x: 210, y: 50, w: 190, h: 92, kind: "app", label: "Search", sub: "rooms and prices" },
    booking: { x: 210, y: 320, w: 190, h: 92, kind: "app", label: "Booking service", sub: "holds, bookings" },
    cache: { x: 470, y: 50, w: 220, h: 92, kind: "cache", label: "Availability cache", sub: "seconds behind", hidden: true },
    db: { x: 470, y: 270, w: 250, h: 150, kind: "db", label: "Reservations", sub: "the room calendar" },
    race: { x: 760, y: 34, w: 224, h: 156, kind: "curve", label: "The last room", sub: "", hidden: true },
  },
  wires: {
    g_s: { from: [166, 210], to: [210, 110] },
    g_b: { from: [166, 254], to: [210, 360] },
    s_db: { from: [400, 130], to: [530, 270] },
    s_c: { from: [400, 96], to: [470, 96] },
    b_db: { from: [400, 366], to: [470, 366] },
  },
  board: {
    legend: [["cyan", "a search or a booking"], ["green", "done"], ["red", "a room sold twice"]],
    flows: {
      searchDb: { from: "guests", path: path(["g_s", 1, "search"], ["s_db", 1, "db"]), color: "cyan", small: true, back: "green" },
      searchCache: { from: "guests", path: path(["g_s", 1, "search"], ["s_c", 1, "cache"]), color: "cyan", small: true, back: "green" },
      book: { from: "guests", path: path(["g_b", 1, "booking"], ["b_db", 1, "db"]), color: "cyan", back: "green" },
      raceBad: { from: "guests", path: path(["g_b", 1, "booking"], ["b_db", 1, "db"]), color: "cyan", back: "green", fail: { at: "db", share: "racePct" } },
      raceSafe: {
        from: "guests",
        path: path(["g_b", 1, "booking"], ["b_db", 1, "db"]),
        color: "cyan",
        back: "green",
        float: { at: "db", text: "409: another room?", color: "amber", chance: 0.2 },
      },
    },
    modes: [
      {
        flows: [],
        tiles: [
          { id: "a", label: "Rooms", icon: "blocks", hue: "cyan", value: "{roomsM} million", note: "{properties} properties" },
          { id: "b", label: "Searches", icon: "target", hue: "violet", value: "{searchPeak}/s", note: "at peak" },
          { id: "c", label: "Bookings", icon: "check", hue: "amber", value: "{bookPeak}/s", note: "{conversionPct} of searches" },
        ],
      },
      {
        flows: [{ flow: "searchDb", weight: 3 }, { flow: "book", weight: 1 }],
        rate: 4,
        tiles: [
          { id: "a", label: "Booking", icon: "list", hue: "cyan", value: "check, insert", note: "no overlap? then add" },
          { id: "b", label: "Sold twice", icon: "check", hue: "green", value: "never seen", note: "in testing" },
          { id: "c", label: "Searches", icon: "target", hue: "violet", value: "{searchPeak}/s", note: "straight to the database" },
        ],
      },
      {
        flows: [{ flow: "searchDb", weight: 3 }, { flow: "book", weight: 2 }, { flow: "raceBad", weight: 1 }],
        rate: 7,
        tiles: [
          { id: "a", label: "Sold twice", icon: "alert", hue: "amber", value: "{doubleBookings}/day", note: "{racePerThousand} in 1,000 bookings race", mood: "bad" },
          { id: "b", label: "Isolation", icon: "sheet", hue: "violet", value: "not enough", note: "snapshots miss the conflict" },
          { id: "c", label: "Who finds out", icon: "users", hue: "cyan", value: "guest two", note: "at the front desk", mood: "bad" },
        ],
      },
      {
        flows: [{ flow: "searchDb", weight: 3 }, { flow: "book", weight: 2 }, { flow: "raceSafe", weight: 1 }],
        rate: 7,
        tiles: [
          { id: "a", label: "Sold twice", icon: "check", hue: "green", value: "{doubleBookings}", note: "the database refuses", mood: "good" },
          { id: "b", label: "The loser", icon: "replay", hue: "amber", value: "409", note: "offered another room" },
          { id: "c", label: "Lock scope", icon: "target", hue: "cyan", value: "one room", note: "so little waiting" },
        ],
      },
      {
        flows: [{ flow: "searchDb", weight: 3 }, { flow: "book", weight: 2 }, { flow: "raceSafe", weight: 1 }],
        rate: 7,
        tiles: [
          { id: "a", label: "Held at once", icon: "hourglass", hue: "violet", value: "{heldRooms}", note: "{holdMin}-minute holds at peak" },
          { id: "b", label: "Share of rooms", icon: "blocks", hue: "cyan", value: "{heldPct}", note: "unsellable meanwhile" },
          { id: "c", label: "Double click", icon: "check", hue: "green", value: "one booking", note: "idempotency key", mood: "good" },
        ],
      },
      {
        flows: [{ flow: "searchCache", weight: 3 }, { flow: "book", weight: 2 }, { flow: "raceSafe", weight: 1 }],
        rate: 7,
        tiles: [
          { id: "a", label: "Search reads", icon: "db", hue: "green", value: "{searchDbReads}/s", note: "{searchCacheHitPct} from the cache", mood: "good" },
          { id: "b", label: "Final check", icon: "check", hue: "cyan", value: "at booking", note: "the cache may be stale" },
          { id: "c", label: "Overbooking", icon: "gauge", hue: "violet", value: "{overbookPct}", note: "a pricing choice, not a bug" },
        ],
      },
    ],
    widgets: {
      db: [
        { kind: "text", text: "Sold twice today: {doubleBookings}", when: { output: "racePct", above: 0 } },
        { kind: "text", text: "Overlaps refused", when: { output: "locked", above: 0 } },
      ],
      race: [{ kind: "custom", name: "locking" }],
    },
    states: [{ node: "db", cls: "tx-hot", when: { output: "racePct", above: 0 } }],
  },
};
