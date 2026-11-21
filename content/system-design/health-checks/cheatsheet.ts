import type { Lesson } from "@tintelix/schema";

export const healthCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "Detection time",
    text: ["Time to find a dead server = check interval × missed checks needed. Every {intervalSec} with {threshold} misses: {detectSec}, and about {lostBefore} requests fail meanwhile at {perServer} a second per server."],
  },
  {
    heading: "Active, passive, heartbeats",
    text: ["Active checks probe each server on a schedule. Passive checks watch real traffic for errors and timeouts, so they notice only after requests fail. Heartbeats flip active checks round: the server reports in, and silence means trouble."],
  },
  {
    heading: "Cascading ejection",
    text: [
      "Ejecting one server moves its load to the rest: {servers} servers at {rps} a second become {survivors} at {afterOneLoad} each. Near the limit ({capRps}), that pushes them past the check's timeout and they are ejected too.",
      "Cap ejections (Envoy's max_ejection_percent) and consider failing open when everything looks down.",
    ],
  },
  {
    heading: "Liveness and readiness",
    text: ["Liveness asks whether to restart the process; check only the process itself. Readiness asks whether to send it traffic now; that check may include the database and other dependencies."],
  },
];
