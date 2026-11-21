const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** `n` in base 62 (0-9a-zA-Z), zero-padded on the left to `width` characters. */
export function toBase62(n: number, width: number): string {
  let v = Math.max(0, Math.floor(n));
  let out = "";
  do {
    out = ALPHABET[v % 62]! + out;
    v = Math.floor(v / 62);
  } while (v > 0);
  return out.padStart(width, "0");
}
