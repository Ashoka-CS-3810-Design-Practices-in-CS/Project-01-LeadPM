import type { Graph, GraphEdge } from '../graph/Graph';
import { MinHeap } from '../graph/MinHeap';
export interface PathSearch { end: string; distance: number; previous: Map<string, GraphEdge> }
export function dijkstra(graph: Graph, sourceId: string, destinationId: string): PathSearch | null {
  const distance = new Map<string, number>(), previous = new Map<string, GraphEdge>();
  const settled = new Set<string>(), queue = new MinHeap();
  // Free initial boarding on any source line; transfers within a journey are charged.
  for (const id of graph.stationStates.get(sourceId) ?? []) { distance.set(id, 0); queue.set(id, 0); }
  while (queue.size) {
    const { key, priority } = queue.pop()!; settled.add(key);
    if (graph.nodes.get(key)!.stationId === destinationId) return { end: key, distance: priority, previous };
    for (const edge of graph.adjacency.get(key)!) {
      if (settled.has(edge.to)) continue;
      const candidate = priority + edge.minutes;
      if (!Number.isFinite(candidate)) throw new Error('Route cost exceeds supported numeric range');
      if (candidate < (distance.get(edge.to) ?? Infinity)) { distance.set(edge.to, candidate); previous.set(edge.to, edge); queue.set(edge.to, candidate); }
    }
  }
  return null;
}
