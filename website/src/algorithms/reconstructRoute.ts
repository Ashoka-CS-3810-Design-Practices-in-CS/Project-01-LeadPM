import type { Graph, GraphEdge } from '../graph/Graph';
import type { RouteResult, RouteSegment } from '../models/RouteResult';
import type { PathSearch } from './dijkstra';
import { detectInterchanges } from './detectInterchanges';
export function reconstructRoute(graph: Graph, sourceId: string, destinationId: string, path: PathSearch): RouteResult {
  const edges: GraphEdge[] = []; let cursor = path.end;
  while (path.previous.has(cursor)) { const e = path.previous.get(cursor)!; edges.push(e); cursor = e.from; }
  edges.reverse();
  const stationIds = [sourceId], connectionIds: string[] = [], segments: RouteSegment[] = [];
  const interchanges = detectInterchanges(edges, graph);
  let current: RouteSegment | undefined; let rideMinutes = 0;
  for (const e of edges) {
    if (e.kind === 'transfer') {
      const destination = graph.nodes.get(e.to)!.stationId;
      if (destination !== graph.nodes.get(e.from)!.stationId) stationIds.push(destination);
      current = undefined;
      continue;
    }
    const from = graph.nodes.get(e.from)!.stationId, to = graph.nodes.get(e.to)!.stationId;
    if (!current) { current = { lineId: e.lineId!, stationIds: [from], connectionIds: [], minutes: 0 }; segments.push(current); }
    current.stationIds.push(to); current.connectionIds.push(e.id); current.minutes += e.minutes;
    stationIds.push(to); connectionIds.push(e.id); rideMinutes += e.minutes;
  }
  const transferMinutes = interchanges.reduce((sum, t) => sum + t.minutes, 0);
  return { sourceId, destinationId, stationIds, connectionIds, segments, interchanges, totalTravelTime: path.distance, rideMinutes, transferMinutes, interchangeCount: interchanges.length };
}
