import type { Step } from "@tintelix/schema";

const REVERSE_SCENE = { add: ["fast", "phones", "rproxy", "backend"], remove: ["office", "fproxy", "net"] };

export const proxySteps: Step[] = [
  {
    id: "forward",
    tag: "technique",
    title: "A forward proxy speaks for the office",
    short: "Forward",
    text: [
      "{employees} staff all download the same {updateMb} MB update. Without a proxy, **{officeGb} GB** crosses the office's internet link.",
      "A forward proxy sits with the clients and makes requests on their behalf. It fetches the update once, keeps a copy and hands it to everyone else: {proxyGb} GB, **{savedPct}** less traffic. The download site sees one address, the proxy's.",
    ],
    note: { kind: "idea", text: "Forward proxies also filter: an office can block sites in one place instead of on every laptop." },
    sim: { mode: "forward", speed: 1 },
    controls: ["employees"],
    live: "LIVE · forward proxy",
  },
  {
    id: "reverse",
    tag: "technique",
    title: "A reverse proxy speaks for the servers",
    short: "Reverse",
    text: [
      "Turn around. A reverse proxy sits in front of the servers and answers for them: clients only ever see its address, never the backends behind it.",
      "It holds the TLS certificate, so encryption ends there instead of on every backend, and it can route requests by path. Here it passes each response straight through to the client.",
    ],
    note: { kind: "tip", text: "One certificate in one place means one place to renew it." },
    changed: [
      { kind: "add", label: "Reverse proxy" },
      { kind: "add", label: "Backend", value: "{workers} workers" },
    ],
    scene: REVERSE_SCENE,
    sim: { mode: "reverse", speed: 1 },
    live: "LIVE · reverse proxy",
  },
  {
    id: "slow-phones",
    tag: "problem",
    title: "Slow phones hold the workers",
    short: "Slow phones",
    text: [
      "Each request needs only {workMs} of work. But passing the response straight through, a worker stays busy until the client has all of it, and {slowPct} of clients are phones that take {slowMs}.",
      "On average a worker is held **{holdMs}**. By Little's law, {rps} requests a second keep **{busyWorkers}** workers busy, and there are only {workers}: just **{servedPct}** get served. Try it: change the share of slow clients.",
    ],
    note: { kind: "watch", text: "Phone replies crawl along the slow network, and the worker that sent them waits the whole way." },
    changed: [{ kind: "mod", label: "Busy workers", value: "{busyWorkers}" }],
    sim: { mode: "reverse", speed: 1 },
    controls: ["slowPct"],
    live: "LIVE · slow clients",
  },
  {
    id: "buffering",
    tag: "solution",
    title: "Buffering frees the workers",
    short: "Buffering",
    text: [
      "Let the proxy buffer. It takes the whole response from the backend over the local network in {lanMs}, then feeds the slow phone itself, which costs it almost nothing.",
      "A worker is now held only **{holdMs}**, so **{busyWorkers}** are busy, and the same pool could take **{maxRps}** requests a second.",
    ],
    note: { kind: "watch", text: "Buffering is wrong for streams, such as a live feed or token-by-token output. Turn it off for those routes only." },
    changed: [{ kind: "mod", label: "Worker held", value: "{holdMs}" }],
    sim: { mode: "reverse", speed: 1 },
    model: { buffering: 1 },
    live: "LIVE · buffering on",
  },
  {
    id: "recap",
    tag: "recap",
    title: "What proxies taught us",
    short: "Recap",
    text: [
      "A forward proxy acts for clients: it hides them, filters what they reach, and caches what they fetch.",
      "A reverse proxy acts for servers: it hides them, ends TLS in one place, routes by path, and absorbs slow clients so workers stay free. Here {busyWorkers} workers do the job.",
    ],
    note: { kind: "next", text: "Coming up in Heartbeats and health checks: how a proxy knows a server is still alive." },
    sim: { mode: "reverse", speed: 1 },
    model: { buffering: 1 },
    live: "LIVE · recap",
  },
];
