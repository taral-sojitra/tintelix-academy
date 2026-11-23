# Lesson 36: Design a web crawler — design note

**Hook title:** Read the whole web, politely. **Scene kind:** `board`. **Builds on:** Bloom filters (17),
message queues (22). **Sources:** general public knowledge (URL frontier with per-host queues and
politeness delays, robots.txt, URL-seen tests, content fingerprints, crawler traps, DNS caching). The
scenario numbers are the lesson's own and deliberately differ from the well-known textbook example.

## Assumptions (model defaults)

2 billion pages a month at 80 KB each; a fetch takes about 500 ms; a plain queue sends 60% of fetches to
the site at its head, which refuses above 10 a second; one request a second per site; 40 links a page,
90% already known; 5 billion known URLs; a quarter of pages duplicate others; 10,000 pages per site per
crawl.

## What the numbers come to

772 pages a second, 386 fetches in flight, 160 TB a month. A plain queue: 463 a second to one site, 98%
refused. Per-site queues: 1 a second per site, 772 sites crawled at once (1,543 at a 2-second delay).
Links: 30,864 a second, 90% already seen; a Bloom filter needs 6 GB against 80 GB for an exact set;
content fingerprints save 40 TB a month. A trap site stops at its 10,000-page budget.

## Steps

1 the ask · 2 a queue and fetchers · 3 the queue hammers one site · 4 the URL frontier (Try it: delay per
site) · 5 URL seen? Bloom filter and content fingerprints · 6 crawler traps, DNS, back-off · 7 wrap-up:
recrawl by change rate, split by site hash.

## Engine changes in this PR

- `frontier` custom widget (with a test): sample per-site queues and a live countdown to each site's next
  allowed fetch.

## Calls I made

- The widget's classes are `.tx-hq…` (`.tx-front` is the front canvas).
- Flows start at the queue or the frontier (`from`), since a crawler has no users box.
