import type { NetworkModel } from '../models/network';
import { stateId, type Graph, type GraphEdge } from './Graph';
export function buildGraph(model: NetworkModel): Graph {
  const graph: Graph = { nodes: new Map(), adjacency: new Map(), stationStates: new Map() };
  for (const s of model.data.stations) {
    const states = s.lineIds.map(lineId => { const id = stateId(s.id, lineId); graph.nodes.set(id, { id, stationId: s.id, lineId }); graph.adjacency.set(id, []); return id; });
    graph.stationStates.set(s.id, states);
  }
  const addEdge = (edge: GraphEdge, bidirectional = true) => {
    graph.adjacency.get(edge.from)!.push(edge);
    if (bidirectional) graph.adjacency.get(edge.to)!.push({ ...edge, from: edge.to, to: edge.from });
  };
  for (const c of model.data.connections) addEdge({ id: c.id, from: stateId(c.from, c.lineId), to: stateId(c.to, c.lineId), minutes: c.minutes, kind: 'travel', lineId: c.lineId }, c.bidirectional !== false);
  for (const t of model.data.transfers) addEdge({ id: t.id, from: stateId(t.stationId, t.fromLineId), to: stateId(t.toStationId ?? t.stationId, t.toLineId), minutes: t.minutes, kind: 'transfer' });
  return graph;
}
