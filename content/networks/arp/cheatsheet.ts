import type { Lesson } from "@tintelix/schema";

export const arpCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "MAC addresses",
    text: ["48 bits as six hex pairs (02:aa:bb:cc:dd:01), one per network card. Used for one link only: a router writes new MAC addresses at every hop. 02: at the start means made up, not set by a maker."],
  },
  {
    heading: "ARP",
    text: ["To send to an IP on its own network, a device asks everyone (ff:ff:ff:ff:ff:ff): \"who has this IP?\" Only the owner answers, directly. To reach anything off the network, it asks for the default gateway's MAC instead."],
  },
  {
    heading: "The cache",
    text: ["Answers are kept for a while ({cacheSec} s here). With {devices} devices and no cache, {packetsPerMin} packets a minute would mean {noiseNoCache} broadcast frames a minute; with it, {noiseCached}."],
  },
  {
    heading: "Watch out",
    text: ["ARP trusts any answer, so a device can claim another's IP (ARP spoofing). Switches can check answers; encryption keeps traffic unreadable anyway. IPv6 uses Neighbor Discovery instead of ARP."],
  },
];
