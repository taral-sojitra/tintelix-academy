import type { Lesson } from "@tintelix/schema";

export const tlsCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "Two jobs",
    text: ["Agree a secret key in the open (key shares, Diffie-Hellman, new each connection) and prove the server's identity (certificate + signature with its private key)."],
  },
  {
    heading: "Certificates",
    text: ["Name + public key, signed by a CA, chained up to a root in the browser or OS. Public certificates last at most {certDays} days since March 2026 (100 from 2027, {certDays2029} from 2029), about {renewalsPerYear} renewals a year now: automate renewal."],
  },
  {
    heading: "Round trips to the first byte",
    text: ["TLS 1.2 over TCP: {tls12FirstByteMs}. TLS 1.3: {tls13FirstByteMs}. QUIC: {quicFirstByteMs}. Resumed sessions can send the request in the first flight (only for repeatable requests)."],
  },
  {
    heading: "What stays visible",
    text: ["Which site (the name sent in the hello), IP addresses, sizes and timing. Hidden: paths, pages, headers, cookies, bodies. SSL is the retired name; use TLS 1.2 or 1.3."],
  },
];
