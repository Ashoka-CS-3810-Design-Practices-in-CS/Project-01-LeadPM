export interface RouteState { id: string; stationId: string; lineId: string }
export interface GraphEdge { id: string; from: string; to: string; minutes: number; kind: 'travel' | 'transfer'; lineId?: string }
export type AdjacencyList = Map<string, GraphEdge[]>;
export interface Graph { nodes: Map<string, RouteState>; adjacency: AdjacencyList; stationStates: Map<string, string[]> }
export const stateId = (stationId: string, lineId: string) => `${stationId}|${lineId}`;
