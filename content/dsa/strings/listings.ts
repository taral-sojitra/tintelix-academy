/** Lesson 3's listings, with site markers (LLD §12). */
export const listings = {
  reverse: {
    ts: `export function isPalindrome(s: string): boolean { // @start
  const reversed: string[] = [];
  for (let i = s.length - 1; i >= 0; i--) {
    reversed.push(s[i]); // @copy
  }
  for (let i = 0; i < s.length; i++) {
    if (s[i] !== reversed[i]) { // @compare
      return false; // @mismatch
    }
  }
  return true; // @done
}`,
    py: `def is_palindrome(s):  # @start
    reversed_s = []
    for i in range(len(s) - 1, -1, -1):
        reversed_s.append(s[i])  # @copy
    for i in range(len(s)):
        if s[i] != reversed_s[i]:  # @compare
            return False  # @mismatch
    return True  # @done`,
  },
  indices: {
    ts: `export function isPalindrome(s: string): boolean { // @start
  let i = 0;
  let j = s.length - 1;
  while (i < j) {
    if (s[i] !== s[j]) { // @compare @changed
      return false; // @mismatch
    }
    i++;
    j--;
  }
  return true; // @done
}`,
    py: `def is_palindrome(s):  # @start
    i, j = 0, len(s) - 1
    while i < j:
        if s[i] != s[j]:  # @compare @changed
            return False  # @mismatch
        i += 1
        j -= 1
    return True  # @done`,
  },
  counts: {
    ts: `export function isAnagram(s: string, t: string): boolean { // @start
  if (s.length !== t.length) return false; // @length
  const counts = new Map<string, number>();
  for (const ch of s) {
    counts.set(ch, (counts.get(ch) ?? 0) + 1); // @count
  }
  for (const ch of t) {
    counts.set(ch, (counts.get(ch) ?? 0) - 1); // @uncount
  }
  for (const n of counts.values()) {
    if (n !== 0) { // @check
      return false; // @differ
    }
  }
  return true; // @done
}`,
    py: `def is_anagram(s, t):  # @start
    if len(s) != len(t):
        return False  # @length
    counts = {}
    for ch in s:
        counts[ch] = counts.get(ch, 0) + 1  # @count
    for ch in t:
        counts[ch] = counts.get(ch, 0) - 1  # @uncount
    for n in counts.values():
        if n != 0:  # @check
            return False  # @differ
    return True  # @done`,
  },
};
