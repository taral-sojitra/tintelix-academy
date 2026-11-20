import type { Lesson } from "@tintelix/schema";

export const cdnCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "When a CDN helps",
    text: ["Your users are far from your servers.", "Most responses are the same for everyone: pages, images, scripts, product listings."],
  },
  {
    heading: "What to cache, and for how long",
    text: [
      "**Versioned files** (app.3f9a.js): keep for a year. A new version gets a new name.",
      "**Pages**: a short TTL, and purge them when they change.",
      "**Personal pages** (cart, account): never cache them at the edge. Mark them private or no-store.",
    ],
  },
  {
    heading: "The numbers",
    text: [
      "One round trip to {originKm} km away takes about {rttOriginMs}, and a page needs {trips}.",
      "From Virginia a page takes {noEdgePageMs}; from a Mumbai edge, {hitPageMs}.",
      "With a {ttlSec} TTL, {edgeHitPct} of reads stay at the edge. This assumes requests spread evenly: {perPageRate} a second for each of {pages} pages.",
    ],
  },
  {
    heading: "Changing cached content",
    text: [
      "**Purge** by URL or tag when content changes. It reaches every edge in about {staleSec}.",
      "**Versioned names** make old copies harmless.",
      "A purge sends a burst of misses to the origin. The edge should send one request per page and hold the rest (request collapsing).",
    ],
  },
];
