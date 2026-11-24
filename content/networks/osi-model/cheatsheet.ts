import type { Lesson } from "@tintelix/schema";

export const osiCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "The seven layers",
    text: ["7 Application (HTTP, DNS), 6 Presentation (encoding, TLS), 5 Session, 4 Transport (TCP, UDP), 3 Network (IP), 2 Data link (Ethernet, Wi-Fi), 1 Physical (bits). From the top: All People Seem To Need Data Processing."],
  },
  {
    heading: "Encapsulation",
    text: ["Going down, each layer adds a header: data becomes a segment (TCP), then a packet (IP), then a frame (Ethernet), then bits. Going up, each layer reads and removes the header its peer wrote."],
  },
  {
    heading: "The numbers",
    text: ["Ethernet carries up to {mtu} bytes per frame (the MTU). Less 20 for IP and 20 for TCP leaves {mss} bytes of data per segment (the MSS). Each segment carries {headerPerSeg} bytes of headers: TCP 20, IP 20, Ethernet 14 + 4."],
  },
  {
    heading: "Who reads what",
    text: ["A switch reads up to layer 2, a router up to layer 3, a layer 4 load balancer reads ports, a layer 7 one reads HTTP. The higher it reads, the more it can decide, and the more work each packet costs."],
  },
];
