import type { Lesson } from "@tintelix/schema";

export const handshakeCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "Opening",
    text: ["SYN (client's start number), SYN-ACK (server's number, acks the client's), ACK. One round trip: {handshakeMs} at a {rttMs} round trip. The request rides with the ACK; its reply starts arriving at {firstByteMs}."],
  },
  {
    heading: "Closing",
    text: ["FIN and ACK in each direction: each side closes its own half."],
  },
  {
    heading: "Reuse",
    text: ["{requests} requests on new connections: {newEachMs}; on one kept-alive connection: {reusedMs} ({savedPct} faster). Connection pools and HTTP keep-alive exist for this."],
  },
  {
    heading: "Watch out",
    text: ["SYN floods fill a server with half-open connections; SYN cookies defend against them. TLS adds its own handshake on top of TCP's."],
  },
];
