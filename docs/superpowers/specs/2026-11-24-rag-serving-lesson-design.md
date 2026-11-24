# Lesson 54: Design a RAG and model-serving system — design note

**Hook title:** Answer from your own documents. **Scene kind:** `board`. **Builds on:** caching (10),
message queues (22), API gateway (26). **Sources:** Vintelix System Design 101, Chapter 141 (paraphrased:
retrieval small and generation dominant, Little's Law for answers in progress, batching on GPUs, streaming
the first token, change capture feeding re-embedding with tombstones for deletes, the staleness window of a
bulk edit, the embedding model version). General public knowledge for answer caching, gateway limits and
permission filtering.

## Assumptions (model defaults)

From the book: 2 million documents × 3 passages; 1,536 four-byte numbers a vector; 50,000 questions an hour
at peak; 3 s an answer; about 20 answers a batching GPU; 200 re-embeddings a second; a 500,000-document
edit. The lesson's own: 1% of peak at launch; top 5 passages; about 2,000 vectors compared; retrieval in
about 5 ms; 20% of questions answered from a cache.

## What the numbers come to

6 million passages, 37 GB of vectors; about 14 questions a second, 42 answers in progress. One GPU, one
answer at a time: 42% busy at launch, 4,167% at peak (42 GPUs to keep up). Batched: 3 GPUs at 69% (5 per
GPU: 9 GPUs). A 10,000-document edit is stale for 50 s, 500,000 for 42 min. With the cache: 56% busy.

## Steps

1 the ask · 2 find the passages, then ask · 3 answers take seconds, and they pile up · 4 batch the GPU's
work (Try it: answers per GPU) · 5 keep the index honest (Try it: documents changed) · 6 cache, limits and
permissions · 7 wrap-up.

## Engine changes in this PR

- `funnel` custom widget (with a test): passages → compared → in the prompt → answer, on a log scale,
  lighting up stage by stage.
