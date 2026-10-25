interface Entry { key: string; priority: number }
/** Indexed binary heap: at most one live entry per state, with genuine decrease-key. */
export class MinHeap {
  private entries: Entry[] = [];
  private positions = new Map<string, number>();
  get size() { return this.entries.length; }
  private less(a: Entry, b: Entry) { return a.priority < b.priority || (a.priority === b.priority && a.key < b.key); }
  private swap(a: number, b: number) { [this.entries[a], this.entries[b]] = [this.entries[b], this.entries[a]]; this.positions.set(this.entries[a].key, a); this.positions.set(this.entries[b].key, b); }
  set(key: string, priority: number) {
    if (!Number.isFinite(priority)) throw new Error('Heap priority must be finite');
    let i = this.positions.get(key);
    if (i === undefined) { i = this.entries.length; this.entries.push({ key, priority }); this.positions.set(key, i); }
    else { if (priority >= this.entries[i].priority) return; this.entries[i].priority = priority; }
    while (i > 0) { const p = Math.floor((i - 1) / 2); if (!this.less(this.entries[i], this.entries[p])) break; this.swap(i, p); i = p; }
  }
  pop(): Entry | undefined {
    const first = this.entries[0]; if (!first) return undefined;
    const last = this.entries.pop()!; this.positions.delete(first.key);
    if (this.entries.length) {
      this.entries[0] = last; this.positions.set(last.key, 0); let i = 0;
      while (true) { let smallest = i; const l = 2 * i + 1, r = l + 1;
        if (l < this.size && this.less(this.entries[l], this.entries[smallest])) smallest = l;
        if (r < this.size && this.less(this.entries[r], this.entries[smallest])) smallest = r;
        if (smallest === i) break; this.swap(i, smallest); i = smallest;
      }
    }
    return first;
  }
}
