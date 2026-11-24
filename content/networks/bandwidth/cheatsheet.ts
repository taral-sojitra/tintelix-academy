import type { Lesson } from "@tintelix/schema";

export const bandwidthCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "Three words",
    text: ["Bandwidth: capacity ({bandwidthMbps} Mbit/s). Throughput: what arrives ({throughputMbps} Mbit/s). Latency: time per round trip ({rttMs}). Small transfers are latency-bound; big ones throughput-bound."],
  },
  {
    heading: "Fill the pipe",
    text: ["Bandwidth × round trip must be in flight: {bdpKB} KB here. TCP starts around 14 KB and doubles per round trip (slow start)."],
  },
  {
    heading: "Loss",
    text: ["One loss-based TCP flow ≈ (MSS / RTT) × 1.22 / √loss: {lossLimitMbps} Mbit/s at {lossPct} and {rttMs}. Halve the RTT: double it."],
  },
  {
    heading: "What helps",
    text: ["Closer servers (CDNs), less loss (wired over crowded Wi-Fi), several connections, newer congestion control (BBR)."],
  },
];
