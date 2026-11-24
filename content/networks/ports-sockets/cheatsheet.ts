import type { Lesson } from "@tintelix/schema";

export const portsCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "Ports",
    text: ["16 bits: {totalPorts} per protocol. Well known (below {wellKnown}): 22 SSH, 25 SMTP, 53 DNS, 80 HTTP, 443 HTTPS. Common others: 3306 MySQL, 5432 PostgreSQL, 6379 Redis."],
  },
  {
    heading: "Connections",
    text: ["Identified by protocol + source IP:port + destination IP:port. Clients get an ephemeral source port per connection (Linux: {ephemeralPorts} of them, 32768–60999)."],
  },
  {
    heading: "Sockets",
    text: ["A program's handle on a connection or a listening port: listen/accept on servers, connect on clients, then read and write."],
  },
  {
    heading: "Port exhaustion",
    text: ["Closed connections hold their port ~{timeWaitSec} s. One client to one server address and port tops out near {maxRate} new connections a second. Reuse connections with a pool."],
  },
];
