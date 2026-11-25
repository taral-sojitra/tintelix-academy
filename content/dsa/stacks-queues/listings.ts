/** Lesson 11's listings, with site markers (LLD §12). */
export const listings = {
  "remove-pairs": {
    ts: `export function isValid(s: string): boolean { // @start
  const pairs = ["()", "[]", "{}"];
  let found = true;
  while (found) {
    found = false;
    for (const p of pairs) {
      if (s.includes(p)) {
        s = s.replace(p, ""); // @remove
        found = true;
      }
    }
  }
  return s === ""; // @done
}`,
    py: `def is_valid(s):  # @start
    pairs = ["()", "[]", "{}"]
    found = True
    while found:
        found = False
        for p in pairs:
            if p in s:
                s = s.replace(p, "", 1)  # @remove
                found = True
    return s == ""  # @done`,
  },
  recent: {
    ts: `export function recentCounts(pings: number[]): number[] { // @start
  const queue: number[] = [];
  const out: number[] = [];
  for (const t of pings) {
    queue.push(t); // @ping
    while (queue[0] < t - 3000) queue.shift(); // @drop @changed
    out.push(queue.length);
  }
  return out; // @done
}`,
    py: `def recent_counts(pings):  # @start
    from collections import deque
    queue = deque()
    out = []
    for t in pings:
        queue.append(t)  # @ping
        while queue[0] < t - 3000:
            queue.popleft()  # @drop @changed
        out.append(len(queue))
    return out  # @done`,
  },
  "look-ahead": {
    ts: `export function dailyTemperatures(temps: number[]): number[] { // @start
  const wait = new Array<number>(temps.length).fill(0);
  for (let i = 0; i < temps.length; i++) {
    for (let j = i + 1; j < temps.length; j++) {
      if (temps[j] > temps[i]) { // @look
        wait[i] = j - i;
        break;
      }
    }
  }
  return wait; // @done
}`,
    py: `def daily_temperatures(temps):  # @start
    wait = [0] * len(temps)
    for i in range(len(temps)):
        for j in range(i + 1, len(temps)):
            if temps[j] > temps[i]:  # @look
                wait[i] = j - i
                break
    return wait  # @done`,
  },
  monotonic: {
    ts: `export function dailyTemperatures(temps: number[]): number[] { // @start
  const wait = new Array<number>(temps.length).fill(0);
  const stack: number[] = []; // days still waiting, coolest on top
  for (let i = 0; i < temps.length; i++) {
    while (stack.length && temps[i] > temps[stack[stack.length - 1]]) {
      const d = stack.pop()!;
      wait[d] = i - d; // @resolve @changed
    }
    stack.push(i); // @push
  }
  return wait; // @done
}`,
    py: `def daily_temperatures(temps):  # @start
    wait = [0] * len(temps)
    stack = []  # days still waiting, coolest on top
    for i, t in enumerate(temps):
        while stack and t > temps[stack[-1]]:
            d = stack.pop()
            wait[d] = i - d  # @resolve @changed
        stack.append(i)  # @push
    return wait  # @done`,
  },
  brackets: {
    ts: `export function isValid(s: string): boolean { // @start
  const open: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
  const stack: string[] = [];
  for (const ch of s) {
    if (!(ch in open)) {
      stack.push(ch); // @push
    } else if (stack.length === 0 || stack[stack.length - 1] !== open[ch]) { // @changed
      return false; // @mismatch
    } else {
      stack.pop(); // @pop
    }
  }
  return stack.length === 0; // @done
}`,
    py: `def is_valid(s):  # @start
    open_for = {")": "(", "]": "[", "}": "{"}
    stack = []
    for ch in s:
        if ch not in open_for:
            stack.append(ch)  # @push
        elif not stack or stack[-1] != open_for[ch]:  # @changed
            return False  # @mismatch
        else:
            stack.pop()  # @pop
    return not stack  # @done`,
  },
};
