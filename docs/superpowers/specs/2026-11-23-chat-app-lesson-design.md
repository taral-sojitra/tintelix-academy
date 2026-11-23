# Lesson 41: Design a chat app — design note

**Hook title:** Delivered, read, and in order. **Scene kind:** `board`. **Builds on:** health checks (8),
message queues (22), fan-out (25), unique IDs (33). **Sources:** Vintelix System Design 101, Chapter 127
(requirements, capacity, WebSockets with sticky routing, durable per-recipient queues, push services to
wake backgrounded phones, sync from the last message ID, server-assigned ordering, per-member receipts,
presence in an eventually consistent store, dropping ciphertext after delivery) and Chapter 130's
large-channel framing, paraphrased.

## Numbers

Chapter 127's: 100 billion sends a day, 85% one-to-one and 15% to groups of 10 → 220 billion deliveries
(2.5 million a second, about 13 million at a 5× peak); 200-byte rows = 20 TB a day if kept. The lesson's
own: 500 million phones online at once; polling every 4 s = 125 million polls a second, 98% empty;
500,000 sockets per chat server = 1,000 servers; a heartbeat every 30 s = 17 million a second.

## Steps

1 the ask · 2 polling (Try it: poll interval) · 3 WebSockets and the session map · 4 store first, then
deliver; push service; sync · 5 groups: per-member deliveries and receipts · 6 presence from heartbeats ·
7 wrap-up.

## Engine changes in this PR

- `presence` custom widget (with a test): contacts online now, and last-seen times counting up.
