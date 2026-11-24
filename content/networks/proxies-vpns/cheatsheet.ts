import type { Lesson } from "@tintelix/schema";

export const vpnCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "VPN",
    text: ["Encrypts whole IP packets and wraps them in new ones (e.g. WireGuard over UDP 51820) to a VPN server, which unwraps them into its network. Works for every app. +{overheadBytes} bytes a packet ({overheadPct})."],
  },
  {
    heading: "Full vs split tunnel",
    text: ["Full: everything via the VPN; sites see the VPN server; detour {directMs} → {vpnMs}. Split: only the private network's addresses go through the tunnel."],
  },
  {
    heading: "Proxy",
    text: ["Per app: the app sends its requests to the proxy (HTTP proxy, or SOCKS), which connects on its behalf. HTTPS goes through as CONNECT host:443: the proxy sees the host, not the content."],
  },
];
