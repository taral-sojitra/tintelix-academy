# Lesson 48: Design S3-like object storage — design note

**Hook title:** Store a trillion files, lose none. **Scene kind:** `board`. **Builds on:** replication
(14), object storage (18). **Sources:** general public knowledge (bucket-and-key objects, copies across
racks with repair, Reed–Solomon erasure coding, a sharded metadata store with an ordered index for
listing, packing small objects into append-only files with compaction). All numbers are the lesson's own;
the coding scheme is 10 + 4, deliberately not the well-known textbook example.

## Assumptions (model defaults)

A trillion objects averaging 250 KB; 20 TB disks failing at 2% a year; 0.1% of objects at launch; 10 data
and 4 parity pieces; 300 bytes of metadata an object on 2 TB shards; 1 GB packed files.

## What the numbers come to

250 PB of data. One copy: 12,500 disks, 0.7 dying a day, 80 million objects each; 2% of everything lost
after a year. Three copies: 750 PB, 37,500 disks, 2.1 dying a day, survives 2 failures. 10 + 4: 350 PB
(1.4×, 400 PB saved), survives 4 (2 parity: 300 PB, survives 2). Metadata 300 TB on 150 shards; 250
million packed files.

## Steps

1 the ask · 2 one file, one disk · 3 a disk a day, gone for good · 4 three copies, three racks ·
5 pieces and parity (Try it: parity pieces) · 6 a trillion names (metadata, packing) · 7 wrap-up.

## Engine changes in this PR

- `erasure` custom widget (with a test): one object's copies or pieces on separate disks, losing one
  disk a second up to what the scheme survives; one copy shows the object gone.
