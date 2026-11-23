import type { Lesson } from "@tintelix/schema";

export const hotelCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "The numbers",
    text: ["{roomsM} million rooms. {searchesPerDay} searches a day, {conversion} convert: {bookingsPerDay} bookings. Peak: {searchPeak} searches and {bookPeak} bookings a second."],
  },
  {
    heading: "No double bookings",
    text: ["Check-then-insert races: both guests see the room free. Snapshot isolation doesn't stop it. Use an exclusion constraint on room + date range, or SELECT … FOR UPDATE on the room; the loser gets 409."],
  },
  {
    heading: "Holds, retries, search",
    text: ["Hold during payment ({holdMin} min: {heldRooms} rooms held at peak). Idempotency keys on bookings. Search from a cache ({searchDbReads} reads a second left); re-check at booking. Overbooking is pricing, not a bug."],
  },
];
