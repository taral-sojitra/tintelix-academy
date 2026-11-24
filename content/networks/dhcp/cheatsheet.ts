import type { Lesson } from "@tintelix/schema";

export const dhcpCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "DORA",
    text: ["Discover (broadcast: any server?), Offer (here's a free address), Request (broadcast: I'll take it), Ack (it's yours). Runs over UDP, ports 67 and 68, because the newcomer has no address yet."],
  },
  {
    heading: "What you get",
    text: ["An IP address, the subnet mask, the default gateway and DNS servers, plus a lease time."],
  },
  {
    heading: "Leases",
    text: ["Renew at half the lease ({renewHours} h of {leaseHours} h). Addresses held ≈ arrivals per hour × lease hours: {visitorsPerDay} a day on {leaseHours} h leases holds about {held} addresses. Short leases for busy guest Wi-Fi, long ones for offices."],
  },
];
