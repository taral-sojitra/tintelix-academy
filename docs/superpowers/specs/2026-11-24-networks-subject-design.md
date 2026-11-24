# Computer Networks subject: design

Date: 2026-11-24. After SQL, Taral asked to start Phase 2 with Networks ("start SQL fixes first, then start
Networks"). The HLD (Claude Docs, "Tintelix High-Level Design") already defines the subject; this note records what
it decided and the calls made to build it. Standing instruction: build and open PRs without stopping for review.

## Intent

"What happens between the click and the reply: DNS, TCP, TLS and HTTP." Each lesson shows packets moving between
boxes while the step text explains them, with numbers from the lesson's own model, the way System Design does.
Networks comes second in the HLD's order because System Design and API lessons lean on it for latency, DNS and TLS.

## Already decided (HLD)

- 20 lessons in 6 modules: Models (OSI, TCP/IP), Addressing (IP addressing, subnetting and CIDR, MAC and ARP,
  DHCP), Transport (TCP vs UDP, three-way handshake, ports and sockets), Application (DNS, HTTP and HTTPS, TLS),
  Moving packets (switches vs routers, routing, NAT, firewalls, proxies and VPNs, load balancers), Performance
  (latency, bandwidth and throughput). The HLD's table gives each lesson's animation and builds-on.
- Diagram lessons on the System scene (boxes, lines, moving requests; the right numbers come from the lesson's
  model), with the header stack at each layer drawn as cards.
- Load balancers is shared with System Design lesson 6, which gains a step on layer 4 vs layer 7 balancing.
  Proxies and VPNs builds on System Design's Proxies lesson instead of repeating it.

## Calls made (Claude's, open to change)

- **Board lessons**, like the System Design case studies: each lesson is a declarative `board` (nodes, wires,
  flows, modes, tiles, widgets) with a model, steps, controls and a cheatsheet. Pictures a board can't draw are
  custom widgets in a new `packages/stage/src/board/net-widgets.ts` (header stacks, address bits, ARP, NAT,
  routing and firewall tables), merged into the existing registry.
- **Ordered exchanges**: protocols are a few named messages in a fixed order (SYN, SYN-ACK, ACK; DHCP's four;
  the DNS walk). A board mode gains `sequence: true`, which plays its flows in the order listed instead of
  picking at random; labels ride on the existing `float`.
- **Shared lessons**: a subject entry can name another subject as the lesson's `home`. Lists link to the home
  subject's page; the Home page's continue card counts the lesson once.
- **Ids** are prefixed `net-` (slugs are not), like SQL's `sql-`, so progress keys can't clash.
- **Builds-on**: HTTP's link to "API 2" waits until APIs exists; Proxies and VPNs builds on System Design's
  `proxies`.
- **Hook titles** for all 20 are written up front, as for SQL.
- **One PR per lesson, stacked**. PR 1: ordered exchanges, shared lessons, the subject and lesson 1 (OSI model).

## Non-goals

Practice questions (Practice isn't built), real packet capture, and a terminal (Linux's shell comes later).

## Anti-goals

Numbers that don't come from the model; animations that show an order the protocol doesn't follow; copying System
Design lessons instead of linking to them.
