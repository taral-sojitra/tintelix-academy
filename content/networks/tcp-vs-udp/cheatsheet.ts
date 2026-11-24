import type { Lesson } from "@tintelix/schema";

export const tcpUdpCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "TCP",
    text: ["A connection; sequence numbers, ACKs, resends, in-order delivery, flow and congestion control. 20-byte header. For web, files, email, databases."],
  },
  {
    heading: "UDP",
    text: ["No connection, no ACKs, no order: each datagram stands alone. 8-byte header (ports, length, checksum). For calls, games, live video, DNS."],
  },
  {
    heading: "Head-of-line blocking",
    text: ["TCP holds everything behind a lost segment until it's resent, about 1.5 round trips ({stallMs} at {rttMs}). At {lossPct} loss a call over TCP would be frozen {tcpFrozenPct} of the time; over UDP {udpGapPct} of the audio is missing. QUIC (HTTP/3) builds reliability on UDP to avoid this."],
  },
];
