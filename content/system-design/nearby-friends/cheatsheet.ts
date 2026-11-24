import type { Lesson } from "@tintelix/schema";

export const friendsCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "The numbers",
    text: ["{sharersM} million sharing, an update every {updateEvery} s: {updateRateM} million updates a second. Polling {friendsEach} friends each refresh would be {friendsEach} reads per update."],
  },
  {
    heading: "Push, filter, cache",
    text: ["WebSockets plus a pub/sub channel per person; sharing friends subscribe. Each update fans out to about {activeFriends} subscribers ({fanoutM} million messages a second); check the distance before sending ({forwardedM} million sent). Keep the latest locations in an expiring cache ({cacheGb} GB)."],
  },
  {
    heading: "Scale and edges",
    text: ["Shard channels across about {pubsubNodes} pub/sub nodes by hashing user IDs; keep the map in a coordination service. Expire silent phones, update less often when still, log history asynchronously, opt in only."],
  },
];
