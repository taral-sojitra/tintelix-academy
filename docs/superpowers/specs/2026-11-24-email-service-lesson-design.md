# Lesson 49: Design an email service — design note

**Hook title:** An inbox for a billion people. **Scene kind:** `board`. **Builds on:** sharding (15),
object storage (18), search engine (37). **Sources:** Vintelix System Design 101, Chapter 32 (paraphrased:
SPF, DKIM, DMARC, reputation recomputed from recent behaviour, a 500,000-address campaign with 6% dead
giving 30,000 hard bounces, suppressing hard bounces, transactional mail on its own subdomain). General
public knowledge for SMTP intake, sharding mailboxes by user, attachments stored once by hash, and
per-mailbox search indexes. All other numbers are the lesson's own and deliberately differ from the
well-known textbook example.

## Assumptions (model defaults)

A billion inboxes receiving 60 and sending 6 messages a day, peaking at 2×; 60 KB a message; 15% with
about 1 MB of attachments, half of them duplicates; one database taking 50,000 writes a second; 0.01% of
users at launch; 20 TB mailbox shards taking 20,000 writes a second; 2 searches a person a day.

## What the numbers come to

694,444 messages a second, 1,388,889 at peak; 1,314 PB of messages and 1,643 PB of attachments a year.
One database: 139 writes a second at launch, 2,778% busy at full size. Sharded by user: 65,700 shards
for a year, 21 writes a second each. 23,148 searches a second; 69,444 messages sent a second.

## Steps

1 the ask · 2 one database of messages · 3 too much mail for one machine · 4 shard by user, attachments
aside · 5 search your own mail · 6 sending without landing in spam (Try it: dead addresses) · 7 wrap-up.

## Engine changes in this PR

None: the lesson reuses the meter and text widgets, as the module spec planned.
