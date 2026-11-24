import type { Lesson } from "@tintelix/schema";

export const ipCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "IPv4",
    text: ["32 bits written as four numbers 0–255 (192.168.1.42). {ipv4B} billion in all, about {v4PerPerson} per person."],
  },
  {
    heading: "Network and host",
    text: ["/n: the first n bits are the network, the rest the host. A /{prefixLen} has {addresses} addresses and {hosts} for devices (the first is the network, the last the broadcast). The mask writes the same split as ones then zeros: /24 is 255.255.255.0."],
  },
  {
    heading: "Private ranges",
    text: ["10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16: about {privateM} million addresses, reused in every home and office, never routed on the internet. Devices behind a router share its public address."],
  },
  {
    heading: "IPv6",
    text: ["128 bits as eight groups of four hex digits; :: shortens one run of zero groups. {ipv6Mant} × 10^{ipv6Exp} addresses. Usually /64 network, 64 bits for the device."],
  },
];
