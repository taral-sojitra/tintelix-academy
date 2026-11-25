const tsNode = `class ListNode {
  constructor(public val: number, public next: ListNode | null = null) {}
}
`;
const pyNode = `class ListNode:
    def __init__(self, val, next=None):
        self.val = val
        self.next = next
`;
const tsBuild = `  // LeetCode hands you head; here the list is built from nums.
  let head: ListNode | null = null;
  for (let i = nums.length - 1; i >= 0; i--) head = new ListNode(nums[i], head);
`;
const pyBuild = `    # LeetCode hands you head; here the list is built from nums.
    head = None
    for x in reversed(nums):
        head = ListNode(x, head)
`;
const tsLoop = `  // LeetCode hands you head; here the list is built from nums, its tail linked back to pos.
  const nodes = nums.map((x) => new ListNode(x));
  for (let i = 0; i + 1 < nodes.length; i++) nodes[i].next = nodes[i + 1];
  if (pos >= 0 && pos < nodes.length) nodes[nodes.length - 1].next = nodes[pos];
  const head = nodes[0] ?? null;
`;
const pyLoop = `    # LeetCode hands you head; here the list is built from nums, its tail linked back to pos.
    nodes = [ListNode(x) for x in nums]
    for a, b in zip(nodes, nodes[1:]):
        a.next = b
    if 0 <= pos < len(nodes):
        nodes[-1].next = nodes[pos]
    head = nodes[0] if nodes else None
`;

/** Lesson 10's listings, with site markers (LLD §12). Each builds its list first, as LeetCode would hand it over. */
export const listings = {
  copy: {
    ts: `${tsNode}
export function reverseList(nums: number[]): number[] {
${tsBuild}
  const values: number[] = []; // @start
  for (let n = head; n; n = n.next) values.push(n.val); // @copy
  for (let n = head; n; n = n.next) n.val = values.pop()!; // @write
  const out: number[] = [];
  for (let n = head; n; n = n.next) out.push(n.val);
  return out; // @done
}`,
    py: `${pyNode}
def reverse_list(nums):
${pyBuild}
    values = []  # @start
    n = head
    while n:
        values.append(n.val)  # @copy
        n = n.next
    n = head
    while n:
        n.val = values.pop()  # @write
        n = n.next
    out = []
    n = head
    while n:
        out.append(n.val)
        n = n.next
    return out  # @done`,
  },
  seen: {
    ts: `${tsNode}
export function hasCycle(nums: number[], pos: number): boolean {
${tsLoop}
  const seen = new Set<ListNode>(); // @start
  for (let n = head; n; n = n.next) {
    if (seen.has(n)) return true; // @again
    seen.add(n); // @visit
  }
  return false; // @end
}`,
    py: `${pyNode}
def has_cycle(nums, pos):
${pyLoop}
    seen = set()  # @start
    n = head
    while n:
        if n in seen:
            return True  # @again
        seen.add(n)  # @visit
        n = n.next
    return False  # @end`,
  },
  "fast-slow": {
    ts: `${tsNode}
export function hasCycle(nums: number[], pos: number): boolean {
${tsLoop}
  let slow = head; // @start
  let fast = head;
  while (fast && fast.next) {
    slow = slow!.next;
    fast = fast.next.next; // @move
    if (slow === fast) return true; // @meet @changed
  }
  return false; // @end
}`,
    py: `${pyNode}
def has_cycle(nums, pos):
${pyLoop}
    slow = fast = head  # @start
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next  # @move
        if slow is fast:
            return True  # @meet @changed
    return False  # @end`,
  },
  reverse: {
    ts: `${tsNode}
export function reverseList(nums: number[]): number[] {
${tsBuild}
  let prev: ListNode | null = null; // @start
  let curr = head;
  while (curr) {
    const next = curr.next; // @save
    curr.next = prev; // @flip @changed
    prev = curr;
    curr = next; // @step
  }
  const out: number[] = [];
  for (let n = prev; n; n = n.next) out.push(n.val);
  return out; // @done
}`,
    py: `${pyNode}
def reverse_list(nums):
${pyBuild}
    prev, curr = None, head  # @start
    while curr:
        nxt = curr.next  # @save
        curr.next = prev  # @flip @changed
        prev = curr
        curr = nxt  # @step
    out = []
    while prev:
        out.append(prev.val)
        prev = prev.next
    return out  # @done`,
  },
};
