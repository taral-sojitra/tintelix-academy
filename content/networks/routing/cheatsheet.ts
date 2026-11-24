import type { Lesson } from "@tintelix/schema";

export const routingCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "Routing table",
    text: ["Prefix → next hop. A destination can match several; the longest prefix wins. 0.0.0.0/0 is the default route: everything not matched elsewhere."],
  },
  {
    heading: "Hop by hop",
    text: ["Every router looks up the destination again in its own table and lowers the TTL. No router knows the whole path. Tables are filled by routing protocols: OSPF inside a network, BGP between networks."],
  },
  {
    heading: "traceroute",
    text: ["Sends TTL 1, 2, 3…; each router that drops the packet replies \"time exceeded\", naming itself and the round trip. traceroute on Mac/Linux, tracert on Windows. Big jumps between hops are usually long cables."],
  },
];
