import type { Lesson } from "@tintelix/schema";

export const switchCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "Switch",
    text: ["Layer 2. Learns source MAC → port from every frame; floods unknown destinations; forwards known ones out of one port. Broadcasts go to every port. A hub, its ancestor, copied every frame {hubCopies} times on {devices} ports."],
  },
  {
    heading: "Router",
    text: ["Layer 3. Joins networks; picks the next hop from the destination IP; lowers TTL; writes a new Ethernet header for the next link. Broadcasts stop here."],
  },
  {
    heading: "Which one?",
    text: ["Same subnet (mask test passes): straight through the switch to the device's MAC. Other subnet: to the default gateway's MAC, then the router takes over."],
  },
];
