import type { Lesson } from "@tintelix/schema";

export const httpCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "HTTP",
    text: ["Request: method + path (GET /style.css), headers, optional body. Response: status (200 OK, 301 moved, 404 not found, 500 server error), headers, body."],
  },
  {
    heading: "Versions",
    text: ["1.1: one request at a time per connection, 6 connections per site. 2: binary frames, many streams on one TCP connection, compressed headers. 3: the same over QUIC on UDP, no cross-stream blocking, setup in one round trip."],
  },
  {
    heading: "The numbers here",
    text: ["{resources} files at a {rttMs} round trip: HTTP/1.1 {h1Ms}, HTTP/2 {h2Ms}, HTTP/3 {h3Ms} (round trips only; file sizes left out)."],
  },
  {
    heading: "HTTPS",
    text: ["HTTP inside TLS, port 443 (plain HTTP: 80). Hides contents, not which site you reached. Adds a round trip over TCP; built into QUIC."],
  },
];
