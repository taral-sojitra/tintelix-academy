import type { Lesson } from "@tintelix/schema";

export const rideCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "The numbers",
    text: ["{driversM} million drivers pinging every {pingEvery} s: {pingRate} writes a second, against {tripWriteRate} trip writes. Pings outnumber trip writes about {pingRatio} to one; keeping them all would be {pingMbps} MB a second."],
  },
  {
    heading: "Split the firehose",
    text: ["Pings go to a location service (204, no body) and an in-memory index of cell → free drivers, latest position only. The trips database keeps the trip's state changes. Match from the rider's cell and its neighbours (H3 hexagons: six equal neighbours), about {candidates} candidates."],
  },
  {
    heading: "Match safely",
    text: ["Claim the driver atomically, then offer; never offer first. Little's Law: {matchRate} requests a second × {matchTime} s each = {inFlight} matches in flight. Split hot cells, keep a silent driver's trip, run each region on its own."],
  },
];
