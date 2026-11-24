import type { Lesson } from "@tintelix/schema";
import { dhcpCheatsheet } from "./cheatsheet";
import { dhcpModel } from "./model";
import { dhcpScene } from "./scene";
import { dhcpSteps } from "./steps";

export const dhcpLesson: Lesson = {
  id: "net-dhcp",
  home: "networks",
  slug: "dhcp",
  topic: "DHCP",
  title: "An address for a newcomer",
  promise: "Watch a phone with no address join Wi-Fi and leave four messages later with an IP, a gateway and a DNS server, on a lease that keeps a café's small pool from running dry.",
  minutes: 7,
  level: 1,
  scene: dhcpScene,
  model: dhcpModel,
  controls: {
    leaseHours: {
      label: "Lease length",
      min: 0.5,
      max: 48,
      step: 0.5,
      unit: "hours",
      readout: "About **{held}** addresses held: **{poolUsedPct}** of the pool, **{failPct}** of newcomers refused.",
    },
    visitorsPerDay: {
      label: "Visitors a day",
      min: 20,
      max: 1000,
      step: 10,
      unit: "visitors",
      readout: "**{visitorsPerDay}** visitors on {leaseHours}-hour leases hold about **{held}** addresses.",
    },
  },
  steps: dhcpSteps,
  components: [],
  buildsOn: ["net-ip-addressing", "net-arp"],
  questions: [],
  cheatsheetInputs: { mode: 3 },
  cheatsheet: dhcpCheatsheet,
};
