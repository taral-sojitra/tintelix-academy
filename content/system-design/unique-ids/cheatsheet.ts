import type { Lesson } from "@tintelix/schema";

export const idsCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "Three ways to make IDs",
    text: ["One counter (auto-increment or a ticket server): ordered and 64 bits, but one machine to scale and keep up; hand out blocks to cut the load. Random UUID: 128 bits, no coordination, no time order. Time · machine · sequence: 64 bits, sorted by time, made locally."],
  },
  {
    heading: "The 64-bit layout",
    text: ["1 sign bit, 41 bits of milliseconds since a start date (about {timeYears} years), then machine and sequence bits sharing 22: with {machineBits} and {seqBits}, {machines} machines can each make {idsPerMilli} IDs a millisecond ({perMachineRate} a second)."],
  },
  {
    heading: "What can break it",
    text: ["A clock stepping back: refuse or wait until time passes the last ID used. Two servers with one machine number: assign numbers from a coordinator, as renewable leases. Running out of time bits: pick a recent start date."],
  },
];
