import type { Lesson } from "@tintelix/schema";
import { dnsCheatsheet } from "./cheatsheet";
import { dnsModel } from "./model";
import { dnsScene } from "./scene";
import { dnsSteps } from "./steps";

export const dnsLesson: Lesson = {
  id: "net-dns",
  home: "networks",
  slug: "dns",
  topic: "DNS",
  title: "From a name to an address",
  promise: "Follow a resolver from the root servers to .com to example.com's own name server, then see how caching and TTLs make almost every later lookup instant.",
  minutes: 7,
  level: 1,
  scene: dnsScene,
  model: dnsModel,
  controls: {
    ttlSec: {
      label: "Cache lifetime (TTL)",
      min: 30,
      max: 3600,
      step: 30,
      unit: "s",
      readout: "**{hitPct}** from the cache, **{avgMs}** on average; a change takes up to **{changeMin} min** to reach everyone.",
    },
    lookupsPerHour: {
      label: "Lookups an hour",
      min: 10,
      max: 5000,
      step: 10,
      unit: "an hour",
      readout: "**{missesPerHour}** misses an hour: **{hitPct}** answered from the cache.",
    },
  },
  steps: dnsSteps,
  components: ["cache"],
  buildsOn: ["net-ip-addressing", "net-tcp-vs-udp"],
  questions: [],
  cheatsheetInputs: { mode: 3 },
  cheatsheet: dnsCheatsheet,
};
