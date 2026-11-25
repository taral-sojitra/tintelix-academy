/** Lesson 9's listings, with site markers (LLD §12). */
export const listings = {
  subsets: {
    ts: `export function subsets(nums: number[]): number[][] { // @start
  const out: number[][] = [];
  const chosen: number[] = [];
  function go(i: number): void {
    if (i === nums.length) {
      out.push([...chosen]); // @leaf
      return;
    }
    chosen.push(nums[i]); // @take
    go(i + 1);
    chosen.pop(); // @undo @changed
    go(i + 1); // @skip
  }
  go(0);
  return out; // @done
}`,
    py: `def subsets(nums):  # @start
    out = []
    chosen = []
    def go(i):
        if i == len(nums):
            out.append(chosen[:])  # @leaf
            return
        chosen.append(nums[i])  # @take
        go(i + 1)
        chosen.pop()  # @undo @changed
        go(i + 1)  # @skip
    go(0)
    return out  # @done`,
  },
  "every-board": {
    ts: `export function solveNQueens(n: number): number[] | null { // @start
  const cols = new Array<number>(n).fill(0);
  const safe = (r: number) =>
    cols.slice(0, r).every((c, q) => c !== cols[r] && Math.abs(c - cols[r]) !== r - q);
  while (true) {
    if (cols.every((_, r) => safe(r))) { // @board
      return [...cols]; // @solved
    }
    // Next board: count up in base n.
    let r = n - 1;
    while (r >= 0 && cols[r] === n - 1) cols[r--] = 0;
    if (r < 0) return null; // @none
    cols[r]++;
  }
}`,
    py: `def solve_n_queens(n):  # @start
    cols = [0] * n
    def safe(r):
        return all(c != cols[r] and abs(c - cols[r]) != r - q for q, c in enumerate(cols[:r]))
    while True:
        if all(safe(r) for r in range(n)):  # @board
            return cols[:]  # @solved
        # Next board: count up in base n.
        r = n - 1
        while r >= 0 and cols[r] == n - 1:
            cols[r] = 0
            r -= 1
        if r < 0:
            return None  # @none
        cols[r] += 1`,
  },
  backtrack: {
    ts: `export function solveNQueens(n: number): number[] | null { // @start
  const cols: number[] = [];
  const safe = (r: number, c: number) =>
    cols.every((qc, qr) => qc !== c && Math.abs(qc - c) !== r - qr);
  function go(r: number): boolean {
    if (r === n) return true;
    for (let c = 0; c < n; c++) {
      if (!safe(r, c)) continue; // @try @changed
      cols.push(c); // @place
      if (go(r + 1)) return true;
      cols.pop(); // @undo
    }
    return false; // @dead
  }
  return go(0) ? cols : null; // @solved @none
}`,
    py: `def solve_n_queens(n):  # @start
    cols = []
    def safe(r, c):
        return all(qc != c and abs(qc - c) != r - qr for qr, qc in enumerate(cols))
    def go(r):
        if r == n:
            return True
        for c in range(n):
            if not safe(r, c):  # @try @changed
                continue
            cols.append(c)  # @place
            if go(r + 1):
                return True
            cols.pop()  # @undo
        return False  # @dead
    return cols if go(0) else None  # @solved @none`,
  },
};
