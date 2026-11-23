# Lesson 47: Design cloud storage and file sync — design note

**Hook title:** Edit on a laptop, see it on a phone. **Scene kind:** `board`. **Builds on:** object storage
(18), consistency models (20). **Sources:** Vintelix System Design 101, Chapters 131–132 (paraphrased:
bytes per change as the key number, chunks named by hash, asking which chunks are missing, fixed versus
content-defined chunking, a change feed with a cursor, keeping both versions on a conflict, batching
bursts). General public knowledge for rsync's rolling hash and restic/Borg. Nothing from the excluded
notes or books.

## Assumptions (model defaults)

From the book: 40 million daily accounts, 3 devices each, 30 changes an account a day, 3× peak; 20 MB
average changed file; 4 MB chunks; about 2 chunks per edit; 5 GB per account. The lesson's own: an upload
tier taking 300 GB/s; 0.5% of peak at launch; an insert halfway through on average; 30% of new chunks
already stored; 1 in 10 offline catch-ups clashing.

## What the numbers come to

120 million devices; 13,889 changes a second, 41,667 at peak; 200 PB. Whole files: 833 GB/s at peak
(1.4% busy at launch, 278% at peak). Fixed chunks: 10 MB an edit, 139%. Content-defined: 8 MB, 5.6 MB
after duplicates, 233 GB/s, 78%. A 2 GB file is 512 chunks and an edit sends 0.39% of it.

## Steps

1 the ask · 2 upload the whole file · 3 moving whole files for small edits · 4 cut files into chunks
(fixed) · 5 cut where the content says, plus the change feed (Try it: file size) · 6 two devices offline:
conflicts and bursts · 7 wrap-up.

## Engine changes in this PR

- `blocksync` custom widget (with a test): one file as 12 chunks with an insert in the 4th; fixed chunks
  resend 9, content-defined resend 2; the current way of cutting is highlighted.
