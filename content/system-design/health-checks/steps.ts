import type { Step } from "@tintelix/schema";

const PEAK = { rps: 1000, fault: 1 };

export const healthSteps: Step[] = [
  {
    id: "silent-death",
    tag: "problem",
    title: "A dead server still gets traffic",
    short: "Silent death",
    text: [
      "{servers} servers share {rps} requests a second, {perServer} each. One of them dies without a sound: no error page, no alarm.",
      "The balancer doesn't know, so it keeps sending that server its share: **{failedPct}** of requests fail, {failedPerSec} every second, for as long as nobody notices.",
    ],
    note: { kind: "watch", text: "Every red reply comes from the same server. Nothing on the balancer's side looks wrong." },
    sim: { mode: "steady", speed: 1 },
    model: { checks: 0 },
    live: "LIVE · no health checks",
  },
  {
    id: "heartbeats",
    tag: "technique",
    title: "Missed heartbeats give it away",
    short: "Health checks",
    text: [
      "Now the balancer checks every server every {intervalSec} with a quick request to a health endpoint. Some systems turn it round: each server sends a heartbeat, and silence means trouble.",
      "After {threshold} missed checks in a row, the server is out of rotation. Finding it took **{detectSec}**, so about **{lostBefore}** requests failed first. Then **{failedPct}** fail, and the other {inRotation} take {loadEach} a second each. Try it: change how often it checks.",
    ],
    note: { kind: "tip", text: "Checking more often finds trouble sooner, but every check is a request on every server, from every balancer." },
    changed: [{ kind: "add", label: "Health checks", value: "every {intervalSec}" }],
    sim: { mode: "steady", speed: 1 },
    controls: ["intervalSec"],
    live: "LIVE · health checks",
  },
  {
    id: "cascade",
    tag: "problem",
    title: "Too eager to eject",
    short: "Cascade",
    text: [
      "Evening peak: {rps} requests a second, {perServer} per server. A server answers its check in time up to {capRps} a second; past that it misses the {timeoutMs} timeout. Then one server stalls in a long garbage-collection pause, misses its checks and is ejected.",
      "Its share lands on the other {survivors}: {afterOneLoad} a second each, over {capRps}. Now they miss their checks too, and by **{cascadeSec}** the balancer has ejected **{ejected}** of {servers}: **{failedPct}** of requests fail.",
    ],
    note: { kind: "watch", text: "Nothing was wrong with the other servers. The checks removed capacity faster than the rest could absorb it." },
    changed: [{ kind: "mod", label: "Traffic", value: "{rps}/s" }],
    sim: { mode: "steady", speed: 1 },
    model: PEAK,
    live: "LIVE · cascading ejection",
  },
  {
    id: "eject-cap",
    tag: "solution",
    title: "Cap how many can leave",
    short: "Ejection cap",
    text: [
      "Cap ejections: at most {maxEjectPct} of the fleet may be out at once. The stalled server still leaves, but the other {inRotation} stay in rotation, slow but serving: **{servedPct}** of requests get through instead of none.",
      "When every server looks unhealthy at once, the check or a shared dependency is the likelier culprit. Some balancers fail open for exactly that reason and send traffic to all of them anyway. Try it: raise the cap.",
    ],
    note: { kind: "idea", text: "Also wait for a few more missed checks before ejecting, and treat the limit the extra load exposed as the real incident." },
    changed: [{ kind: "add", label: "Ejection cap", value: "{maxEjectPct}" }],
    sim: { mode: "steady", speed: 1 },
    controls: ["maxEjectPct"],
    model: { ...PEAK, maxEjectPct: 10 },
    live: "LIVE · ejection cap",
  },
  {
    id: "recap",
    tag: "recap",
    title: "What health checks taught us",
    short: "Recap",
    text: [
      "Without checks, a dead server quietly fails its share. Checks every {intervalSec} with {threshold} misses find it in {detectSec}; a cap on ejections keeps one bad server from emptying the fleet ({servedPct} served here).",
      "Keep two questions apart: is the process alive (restart it if not), and can it serve right now (take it out of rotation if not, without a restart). A database outage answers the second, never the first.",
    ],
    note: { kind: "next", text: "Coming up in Stateless services and sticky sessions: why it matters that any server can take any request." },
    sim: { mode: "steady", speed: 1 },
    model: { ...PEAK, maxEjectPct: 10 },
    live: "LIVE · recap",
  },
];
