# Lesson 38: Design search autocomplete — design note

**Hook title:** Guess the query after two letters. **Scene kind:** `board`. **Builds on:** caching (10),
sharding (15). **Sources:** general public knowledge (a trie with top-k completions cached at each node,
built offline from search logs, browser caching, blocklist filtering, sharding by prefix range). All
numbers and sample queries are the lesson's own and differ from the well-known textbook example.

## Assumptions (model defaults)

50 million people a day, 8 searches each, about 6 requests per search, peak 2×; 100 million distinct
past queries; a database scanning 5 million rows a second per core, 64 cores; 1% of peak at launch;
queries average 12 characters, a quarter of trie nodes unshared, 64 bytes a node; 50,000 lookups a
second per trie server; 30% of requests answered by the browser cache.

## What the numbers come to

27,778 requests a second, 55,556 at peak. A sorted prefix query: 30 ms for two letters (769 ms for one, 1
ms for three); 26% busy at launch, 2,568% at full traffic, 96% too late. A trie: 19 GB in memory, 3
servers (two for the peak plus a spare). The browser cache leaves 38,889 a second for the servers.

## Steps

1 the ask · 2 ask the database at launch · 3 every keystroke is a sort (Try it: letters typed) · 4 a trie
with top fives · 5 build it offline from logs, swap it in · 6 the browser cache, blocklist, prefix
sharding · 7 wrap-up.

## Engine changes in this PR

- `trie` custom widget (with a test): the typed prefix walking c → ca → cat, with the top five cached at
  each node.
