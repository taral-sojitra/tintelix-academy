# Lesson 59: Design a stock exchange — design note

**Hook title:** Match a buy and a sell in microseconds. **Scene kind:** `board`. **Builds on:** message
queues (22), unique IDs (33). **Sources:** general public knowledge (price-time priority, in-memory order
books with one thread per instrument, a sequencer and journal for deterministic replay and hot standby,
multicast market data with gap replay). All numbers are the lesson's own and deliberately differ from the
well-known textbook example.

## Assumptions (model defaults)

400 million orders in a 6.5-hour session, 8× at the open; 3,000 stocks on 16 engines; 0.5% at launch; a
database matching about 5,000 orders a second at 2 ms; 5 µs a match in memory; the busiest stock taking 5%
of orders; 100 bytes an order in the journal; a quarter of orders trading; 2,000 subscribing firms.

## What the numbers come to

17,094 orders a second on average, 136,752 at the open. Database matching: 684 a second at launch (14%),
2,735% at the open. In memory: the busiest stock's thread 3.4% busy (50% of orders: 34%). Journal 40 GB a
day. Market data 170,940 messages a second; one by one to 2,000 firms would be 342 million.

## Steps

1 the ask · 2 match with a database query · 3 too slow, and not fair · 4 an order book in memory, one
thread a stock (Try it: busiest stock's share) · 5 one sequence, one journal · 6 tell everyone at once
(Try it: firms) · 7 wrap-up.

## Engine changes in this PR

- `orderbook` custom widget (with a test): asks over bids, a buy order arriving, and the trade sweeping the
  two cheapest asks.
