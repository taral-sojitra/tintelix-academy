import type { Lesson } from "@tintelix/schema";

export const leaderCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "Majority",
    text: ["A group of N needs more than N/2 to elect a leader or commit a write: {majority} of {nodes}, so it survives {canLose} failures. Run odd sizes: 4 servers survive only 1 failure, same as 3, and a 2–2 split stops both halves."],
  },
  {
    heading: "Election",
    text: ["The leader sends heartbeats (every {heartbeatMs} here, etcd's default). A follower that hears nothing for the election timeout ({electionTimeoutMs}) raises the term and asks for votes; one vote per server per term. Random extra waits make split votes rare. Keep the heartbeat near the round trip and the timeout 5–10× that: shorter fails over faster but blips start needless elections."],
  },
  {
    heading: "Fencing tokens",
    text: ["A paused or cut-off leader doesn't know it was replaced. Give every leadership a number that only goes up (the term) and make the resource reject anything lower than the highest it has seen. Raft (etcd, Consul) and ZooKeeper's Zab provide the terms; the check is yours to add where writes land."],
  },
];
