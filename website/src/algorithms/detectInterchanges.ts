import type { Graph, GraphEdge } from '../graph/Graph';
import type { InterchangeInstruction } from '../models/RouteResult';
export function detectInterchanges(edges: GraphEdge[], graph: Graph): InterchangeInstruction[] {
  return edges.filter(e => e.kind === 'transfer').map(e => ({
    stationId: graph.nodes.get(e.from)!.stationId,
    toStationId: graph.nodes.get(e.to)!.stationId === graph.nodes.get(e.from)!.stationId ? undefined : graph.nodes.get(e.to)!.stationId,
    fromLineId: graph.nodes.get(e.from)!.lineId,
    toLineId: graph.nodes.get(e.to)!.lineId,
    minutes: e.minutes,
    transferId: e.id,
  }));
}
