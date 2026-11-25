/** Lesson 8's listings, with site markers (LLD §12). */
export const listings = {
  factorial: {
    ts: `export function factorial(n: number): number { // @call
  if (n <= 1) return 1; // @base @changed
  return n * factorial(n - 1); // @ret
}`,
    py: `def factorial(n):  # @call
    if n <= 1:
        return 1  # @base @changed
    return n * factorial(n - 1)  # @ret`,
  },
  "no-base": {
    ts: `export function factorial(n: number): number { // @call
  return n * factorial(n - 1); // @ret
}`,
    py: `def factorial(n):  # @call
    return n * factorial(n - 1)  # @ret`,
  },
  naive: {
    ts: `export function fib(n: number): number { // @call
  if (n <= 1) return n; // @base
  return fib(n - 1) + fib(n - 2); // @ret
}`,
    py: `def fib(n):  # @call
    if n <= 1:
        return n  # @base
    return fib(n - 1) + fib(n - 2)  # @ret`,
  },
  memo: {
    ts: `export function fib(n: number): number { // @start
  const memo = new Map<number, number>();
  function go(k: number): number { // @call
    if (memo.has(k)) return memo.get(k)!; // @memo @changed
    if (k <= 1) return k; // @base
    const value = go(k - 1) + go(k - 2);
    memo.set(k, value); // @ret @changed
    return value;
  }
  return go(n); // @done
}`,
    py: `def fib(n):  # @start
    memo = {}
    def go(k):  # @call
        if k in memo:
            return memo[k]  # @memo @changed
        if k <= 1:
            return k  # @base
        value = go(k - 1) + go(k - 2)
        memo[k] = value  # @ret @changed
        return value
    return go(n)  # @done`,
  },
};
