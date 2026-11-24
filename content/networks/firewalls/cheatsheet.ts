import type { Lesson } from "@tintelix/schema";

export const firewallCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "Rules",
    text: ["Match on protocol, source and destination address, and port; checked top to bottom, the first match decides. End with \"drop everything else\" (default deny)."],
  },
  {
    heading: "Stateful",
    text: ["Remembers connections started inside and lets their replies in. Stateless would have to open {statelessHole} client ports to let replies through."],
  },
  {
    heading: "Kinds",
    text: ["Network firewall: layers 3–4 (addresses, ports, state). Web application firewall: layer 7 (reads HTTP). Cloud security groups: per-server, stateful. Host firewalls on every machine."],
  },
];
