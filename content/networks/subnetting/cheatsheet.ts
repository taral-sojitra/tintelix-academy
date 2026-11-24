import type { Lesson } from "@tintelix/schema";

export const subnetCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "Subnet sizes",
    text: ["/24: 256 addresses (254 usable). /25: 128. /26: 64. /27: 32. /28: 16. /29: 8. /30: 4 (2 usable, for router links). Each extra prefix bit doubles the subnets and halves their size."],
  },
  {
    heading: "The mask test",
    text: ["AND both addresses with the mask. Equal: same subnet, send directly. Different: send to the default gateway. With /{subPrefix}, .{hostA} is in .{aNet} and .{hostB} is in .{bNet}."],
  },
  {
    heading: "CIDR",
    text: ["Any prefix length, not just classes A (/8), B (/16), C (/24). {needHosts} devices fit a /{cidrPrefix} ({cidrSize} addresses) instead of a /{classPrefix} ({classSize}). Neighbouring blocks can be announced as one shorter prefix."],
  },
];
