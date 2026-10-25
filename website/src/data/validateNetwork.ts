import { networkSchema } from './schema';
import type { NetworkModel } from '../models/network';
export function validateNetwork(input: unknown): NetworkModel {
  const data = networkSchema.parse(input);
  const ensure = (ok: unknown, message: string) => { if (!ok) throw new Error(`Invalid network: ${message}`); };
  const unique = (ids: string[], label: string) => ensure(new Set(ids).size === ids.length, `duplicate ${label}`);
  unique(data.stations.map(s => s.id), 'station ID'); unique(data.stations.map(s => s.code.toLowerCase()), 'station code');
  unique(data.lines.map(l => l.id), 'line ID'); unique([...data.connections, ...data.transfers].map(e => e.id), 'edge ID');
  const stations = new Map(data.stations.map(s => [s.id, s]));
  const lines = new Map(data.lines.map(l => [l.id, l]));
  const memberships = new Set<string>();
  for (const s of data.stations) { unique(s.lineIds, 'station membership'); for (const l of s.lineIds) { ensure(lines.has(l), `unknown line ${l}`); memberships.add(`${s.id}|${l}`); } }
  const orderedMemberships = new Set<string>();
  const adjacent = new Set<string>();
  const pair = (a: string, b: string) => [a, b].sort().join('|');
  for (const l of data.lines) {
    unique(l.stationIds, 'line station');
    l.stationIds.forEach(s => {
      ensure(stations.has(s) && memberships.has(`${s}|${l.id}`), `inconsistent station ${s} on ${l.id}`);
      orderedMemberships.add(`${s}|${l.id}`);
    });
    const covered = new Set<string>();
    const lineStations = new Set(l.stationIds);
    for (const path of l.paths ?? [l.stationIds]) path.forEach((s,i) => {
      ensure(lineStations.has(s), 'unknown path station'); covered.add(s);
      if(i) { ensure(path[i-1] !== s, 'path self loop'); adjacent.add(`${l.id}|${pair(path[i-1],s)}`); }
    });
    ensure(covered.size === l.stationIds.length, 'incomplete path coverage');
  }
  ensure(memberships.size === orderedMemberships.size, 'line membership missing from ordered line');
  const seen = new Set<string>();
  for (const e of data.connections) {
    const key = `${e.lineId}|${pair(e.from, e.to)}`;
    ensure(e.from !== e.to && adjacent.has(key), `invalid connection ${e.id}`);
    ensure(!seen.has(key), `duplicate connection ${e.id}`); seen.add(key);
  }
  ensure(seen.size === adjacent.size, 'missing adjacent connection');
  const transfers = new Set<string>();
  for (const t of data.transfers) {
    ensure(t.fromLineId !== t.toLineId && memberships.has(`${t.stationId}|${t.fromLineId}`) && memberships.has(`${t.toStationId ?? t.stationId}|${t.toLineId}`), `invalid transfer ${t.id}`);
    const key = pair(`${t.stationId}|${t.fromLineId}`,`${t.toStationId ?? t.stationId}|${t.toLineId}`);
    ensure(!transfers.has(key), `duplicate transfer ${t.id}`); transfers.add(key);
  }
  // A missing transfer means changing between those lines is deliberately unavailable.
  return { data, stations, lines };
}
