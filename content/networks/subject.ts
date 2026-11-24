import type { Subject } from "@tintelix/schema";

const l = (slug: string, topic: string, title: string, summary: string, buildsOn: string[] = []) => ({
  id: `net-${slug}`, slug, topic, title, summary, buildsOn: buildsOn.map((b) => (b.startsWith("sd:") ? b.slice(3) : `net-${b}`)),
});

/** The 20 Computer Networks lessons in six modules (HLD §Computer Networks). Load balancers lives in System Design. */
export const networks: Subject = {
  id: "networks",
  title: "Computer Networks",
  blurb: "What happens between the click and the reply: DNS, TCP, TLS and HTTP.",
  phase: 2,
  modules: [
    {
      title: "Models",
      lessons: [
        l("osi-model", "OSI model", "Seven layers, one message", "One message goes down seven layers, each adding a header, then up seven on the other side, each removing one."),
        l("tcp-ip-model", "TCP/IP model", "The four layers that ship", "The same journey in four layers, beside OSI: which layers merge, and where Ethernet, IP, TCP and HTTP sit.", ["osi-model"]),
      ],
    },
    {
      title: "Addressing",
      lessons: [
        l("ip-addressing", "IP addressing", "Where on the internet?", "An IPv4 address as 32 bits split into network and host parts; private ranges; IPv6's 128 bits.", ["tcp-ip-model"]),
        l("subnetting", "Subnetting and CIDR", "Same street or across town?", "A /24 split into four /26 subnets of 64 addresses, and how a mask decides whether two hosts share one.", ["ip-addressing"]),
        l("arp", "MAC addresses and ARP", "Who has 192.168.1.1?", "A laptop knows the router's IP but not its MAC address, so it broadcasts an ARP request and caches the reply.", ["ip-addressing"]),
        l("dhcp", "DHCP", "An address for a newcomer", "A phone joins Wi-Fi with no address: discover, offer, request, acknowledge, and it leaves with an IP, a gateway and DNS.", ["ip-addressing", "arp"]),
      ],
    },
    {
      title: "Transport",
      lessons: [
        l("tcp-vs-udp", "TCP vs UDP", "Every byte, or right now?", "TCP numbers, acknowledges and resends in order; UDP sends with no guarantees, which suits voice and games.", ["tcp-ip-model"]),
        l("handshake", "Three-way handshake", "Hello before the data", "SYN, SYN-ACK and ACK open a connection before data flows, costing a round trip; FIN closes it.", ["tcp-vs-udp"]),
        l("ports-sockets", "Ports and sockets", "Which program gets this?", "One server address, many ports; each connection is told apart by protocol and both ends' address and port.", ["tcp-vs-udp"]),
      ],
    },
    {
      title: "Application",
      lessons: [
        l("dns", "DNS", "From a name to an address", "A resolver walks from the root to .com to the domain's name server, then caches the answer for its TTL.", ["ip-addressing", "tcp-vs-udp"]),
        l("http", "HTTP and HTTPS", "One request or many at once?", "HTTP/1.1 sends one request at a time per connection, HTTP/2 many streams on one, HTTP/3 rides QUIC on UDP.", ["handshake"]),
        l("tls", "TLS", "Private before the first byte", "The TLS 1.3 handshake agrees keys and checks the certificate in one round trip; SSL is the retired name.", ["http"]),
      ],
    },
    {
      title: "Moving packets",
      lessons: [
        l("switches-routers", "Switches vs routers", "Next door or another network?", "A switch forwards frames by MAC address inside a network; a router forwards packets by IP between networks.", ["arp"]),
        l("routing", "Routing", "Hop by hop across the world", "Each router picks the next hop by the longest matching prefix in its table; traceroute shows the path.", ["subnetting", "switches-routers"]),
        l("nat", "NAT", "Twenty devices, one address", "Home devices share one public address: the router rewrites addresses and ports and keeps a table for replies.", ["ip-addressing", "ports-sockets"]),
        l("firewalls", "Firewalls", "Who gets in?", "Rules allow or drop packets by address, port and protocol; a stateful firewall lets replies back in.", ["ports-sockets"]),
        l("proxies-vpns", "Proxies and VPNs", "A tunnel or a middleman?", "A VPN wraps every packet in an encrypted tunnel to another network; a proxy relays one application's traffic.", ["tls", "sd:proxies"]),
        {
          id: "load-balancing",
          slug: "load-balancing",
          topic: "Load balancers",
          title: "Who gets the next request?",
          summary: "Shared with System Design, with a step on balancing at layer 4 or layer 7.",
          buildsOn: [],
          home: "system-design" as const,
        },
      ],
    },
    {
      title: "Performance",
      lessons: [
        l("latency", "Latency", "Where the milliseconds go", "Distance at the speed of light in fibre, each hop, queues, and the round trips a page load needs.", ["handshake"]),
        l("bandwidth", "Bandwidth and throughput", "A wide pipe, a slow trickle", "Bandwidth is capacity; throughput is what arrives, cut by packet loss, congestion and round trips.", ["latency"]),
      ],
    },
  ],
};
