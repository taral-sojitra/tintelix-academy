import type { Lesson } from "@tintelix/schema";

export const tcpIpCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "Four layers",
    text: ["Application (OSI 5–7: HTTP, DNS, TLS), Transport (OSI 4: TCP, UDP), Internet (OSI 3: IP), Link (OSI 1–2: Ethernet, Wi-Fi). Layer numbers in everyday talk are still OSI's."],
  },
  {
    heading: "Who runs what",
    text: ["Application: your program. Transport and Internet: the operating system, reached through sockets. Link: the network card and its driver."],
  },
  {
    heading: "Hop by hop vs end to end",
    text: ["Routers run Internet and Link only. Across {hops} routers the Ethernet header is rewritten {linkWrites} times and the TTL drops from {ttl} to {ttlLeft}; TCP and HTTP are read only by the two ends."],
  },
];
