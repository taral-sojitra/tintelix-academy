# Lesson 33: Design a unique ID generator — design note

**Hook title:** Never hand out the same ID twice. **Scene kind:** `board`. **Builds on:** sharding (15),
leader election (29). **Sources:** clock skew from Vintelix System Design 101, Chapter 77 (NTP holds
machines within a few milliseconds and can step clocks back); the 64-bit layout is Twitter's publicly
documented Snowflake design (1 sign bit, 41 bits of milliseconds, 10 machine bits, 12 sequence bits). All
scenario numbers are the lesson's own.

## Assumptions (model defaults)

50 app servers, each needing up to 2,000 IDs a second at peak (2 servers at launch); a counter database
answering about 5,000 a second; a 5 ms clock step back; machine 37 as the example.

## What the numbers come to

100,000 IDs a second in all. One counter: 80% busy at launch, 2,000% at full traffic (95% failing).
UUIDs: 128 bits, unordered. Time · machine · sequence: 1,024 machines, 4,096 IDs a millisecond each
(4,096,000 a second, 2,048× what a server needs), about 70 years of time bits; 5 machine bits leave only
32 numbers for 50 servers. A 5 ms step back holds about 10 IDs per server; none repeat.

## Steps

1 the ask (nextId, 64 bits, time-sorted) · 2 one counter at launch · 3 fifty servers swamp it · 4 random
UUIDs · 5 time, machine and sequence in 64 bits (Try it: machine bits) · 6 weak spots: a clock stepping back
and machine-number leases from a coordinator · 7 wrap-up.

## Engine changes in this PR

- `bitlayout` custom widget (with a test): the 64 bits drawn as sign/time/machine/sequence and the live
  ID they make (BigInt), or "doesn't fit" when the example machine number needs more bits.

## Calls I made

- Output names avoid the formatter's suffixes (`idsPerMilli`, not `…PerMs`, which would print as ms).
- The widget's classes are `.tx-idbits…`: `.tx-bits` already belongs to the Bloom filter lesson, and its
  grid rules broke the layout. New widget classes now get checked against stage.css before use.
