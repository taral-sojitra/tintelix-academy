import type { Lesson } from "@tintelix/schema";

export const ragCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "The numbers",
    text: ["{docsM} million documents → {chunksM} million passages → {vectorGb} GB of vectors. {qps} questions a second × {genSec} each = {inFlight} answers in progress."],
  },
  {
    heading: "Retrieve, then generate",
    text: ["Embed passages once; nearest-neighbour search finds the top {topK} in about {retrievalMs}. Batch about {perGpu} answers a GPU: {gpusNeeded} GPUs, not {unbatchedGpus}. Stream tokens; return sources."],
  },
  {
    heading: "Fresh and safe",
    text: ["Change capture from the documents' log feeds re-embedding ({embedRate}/s; {changedDocs} changes = {staleSec} stale). Record the embedding model version. Cache repeated questions, rate-limit at a gateway, filter retrieval by permission."],
  },
];
