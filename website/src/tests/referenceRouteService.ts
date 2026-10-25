import type { NetworkModel } from '../models/network';
import type { RouteResult } from '../models/RouteResult';
import { buildGraph } from '../graph/buildGraph';
import { dijkstra } from '../algorithms/dijkstra';
import { reconstructRoute } from '../algorithms/reconstructRoute';
export type RouteOutcome = { status: 'success'; route: RouteResult } | { status: 'error' | 'no-route'; message: string };
export function createRouteService(model: NetworkModel) {
  const graph = buildGraph(model);
  return { graph, find(sourceId: string | null, destinationId: string | null): RouteOutcome {
    if (!sourceId || !destinationId) return { status: 'error', message: 'Select both a source and a destination.' };
    if (!model.stations.has(sourceId) || !model.stations.has(destinationId)) return { status: 'error', message: 'Unknown station. Choose a station from the results.' };
    if (sourceId === destinationId) return { status: 'error', message: 'Source and destination must be different.' };
    try {
      const path = dijkstra(graph, sourceId, destinationId);
      return path ? { status: 'success', route: reconstructRoute(graph, sourceId, destinationId, path) } : { status: 'no-route', message: 'No available route between the selected stations.' };
    } catch { return { status: 'error', message: 'This route could not be calculated. Check the network data.' }; }
  } };
}
