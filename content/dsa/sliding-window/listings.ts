/** Lesson 6's listings, with site markers (LLD §12). */
export const listings = {
  fixed: {
    ts: `export function maxVowels(s: string, k: number): number { // @start
  const isVowel = (ch: string) => "aeiou".includes(ch);
  if (s.length < k) return 0; // @short
  let count = 0;
  for (let i = 0; i < k; i++) {
    if (isVowel(s[i])) count++; // @fill
  }
  let best = count;
  for (let r = k; r < s.length; r++) {
    count += (isVowel(s[r]) ? 1 : 0) - (isVowel(s[r - k]) ? 1 : 0); // @slide @changed
    best = Math.max(best, count);
  }
  return best; // @done
}`,
    py: `def max_vowels(s, k):  # @start
    def is_vowel(ch):
        return ch in "aeiou"
    if len(s) < k:
        return 0  # @short
    count = 0
    for i in range(k):
        if is_vowel(s[i]):  # @fill
            count += 1
    best = count
    for r in range(k, len(s)):
        count += is_vowel(s[r]) - is_vowel(s[r - k])  # @slide @changed
        best = max(best, count)
    return best  # @done`,
  },
  restart: {
    ts: `export function lengthOfLongestSubstring(s: string): number { // @start
  let best = 0;
  for (let i = 0; i < s.length; i++) {
    const seen = new Set<string>(); // @restart
    for (let j = i; j < s.length; j++) {
      if (seen.has(s[j])) break; // @repeat
      seen.add(s[j]); // @look
      best = Math.max(best, j - i + 1);
    }
  }
  return best; // @done
}`,
    py: `def length_of_longest_substring(s):  # @start
    best = 0
    for i in range(len(s)):
        seen = set()  # @restart
        for j in range(i, len(s)):
            if s[j] in seen:
                break  # @repeat
            seen.add(s[j])  # @look
            best = max(best, j - i + 1)
    return best  # @done`,
  },
  window: {
    ts: `export function lengthOfLongestSubstring(s: string): number { // @start
  const inWindow = new Set<string>();
  let left = 0;
  let best = 0;
  for (let right = 0; right < s.length; right++) {
    while (inWindow.has(s[right])) { // @changed
      inWindow.delete(s[left]); // @shrink
      left++;
    }
    inWindow.add(s[right]); // @grow
    best = Math.max(best, right - left + 1);
  }
  return best; // @done
}`,
    py: `def length_of_longest_substring(s):  # @start
    in_window = set()
    left = 0
    best = 0
    for right in range(len(s)):
        while s[right] in in_window:  # @changed
            in_window.remove(s[left])  # @shrink
            left += 1
        in_window.add(s[right])  # @grow
        best = max(best, right - left + 1)
    return best  # @done`,
  },
};
