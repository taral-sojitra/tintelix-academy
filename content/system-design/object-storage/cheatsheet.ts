import type { Lesson } from "@tintelix/schema";

export const uploadCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "Object storage",
    text: ["A key-value store for large values over HTTP: PUT, GET, DELETE, LIST by prefix. Objects are immutable, the namespace is flat (slashes are just characters), and request rates are limited per prefix."],
  },
  {
    heading: "Signed URLs",
    text: ["The app checks the user and signs a URL for one object with a short expiry; the client uploads or downloads directly. Here {busyWorkers} worker signs for {uploadsPerSec} uploads a second, against {serversNeeded} servers' worth when the app relays the bytes."],
  },
  {
    heading: "Multipart uploads",
    text: ["Split big files into parts uploaded separately and joined at the end. A dropped connection costs one {partMb} MB part ({redoSec}), not the whole file."],
  },
];
