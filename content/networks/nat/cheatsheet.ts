import type { Lesson } from "@tintelix/schema";

export const natCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "How it works",
    text: ["Out: source private IP:port → public IP:new port, recorded in the NAT table. Back: destination public port → looked up → rewritten to the private IP:port."],
  },
  {
    heading: "Limits",
    text: ["One public address has {natPorts} ports to hand out. {devices} devices × {connsPerDevice} connections = {natEntries} entries ({portsUsedPct})."],
  },
  {
    heading: "Inbound",
    text: ["Unasked packets have no entry and are dropped. Port forwarding adds a fixed entry so outsiders can reach a device. NAT hides devices but isn't a firewall."],
  },
  {
    heading: "Carrier-grade NAT",
    text: ["ISPs share one address among about {homesPerIp} homes, {portsPerHome} ports each. IPv6 gives every device its own address, so no translation is needed."],
  },
];
