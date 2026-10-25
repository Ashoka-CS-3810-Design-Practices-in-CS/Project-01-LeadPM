import type { NetworkModel } from '../models/network';
import type { RouteResult } from '../models/RouteResult';
export function RouteDetails({ model, route }: { model: NetworkModel; route: RouteResult | null }) {
  if (!route) return <section className="empty-route"><span className="route-glyph" aria-hidden="true">↳</span><h2>Your route starts here</h2><p>Select stations using search or click the map. Your journey and line changes will appear here.</p></section>;
  return <section className="route-details" aria-label="Route details"><div className="eyebrow">FASTEST ESTIMATED ROUTE</div>
    <div className="metrics"><div><strong>{route.totalTravelTime}<small> min</small></strong><span>estimated total</span></div><div><strong>{route.interchangeCount}</strong><span>line {route.interchangeCount === 1 ? 'change' : 'changes'}</span></div><div><strong>{route.connectionIds.length}</strong><span>stops travelled</span></div></div>
    <p className="time-breakdown">{route.rideMinutes} min riding + {route.transferMinutes} min transferring</p>
    <h2>{model.stations.get(route.sourceId)!.name} <span aria-hidden="true">→</span> {model.stations.get(route.destinationId)!.name}</h2>
    <ol className="segments">{route.segments.map((s, i) => <li key={i} style={{ borderColor: model.lines.get(s.lineId)!.color }}><div className="segment-heading"><strong>{model.lines.get(s.lineId)!.name}</strong><span>{s.minutes} min</span></div><p>{s.stationIds.map(id => model.stations.get(id)!.name).join(' → ')}</p></li>)}</ol>
    {route.interchanges.map((t, i) => <div className="transfer" key={`${t.transferId}-${i}`}><strong>{t.toStationId ? `Walk from ${model.stations.get(t.stationId)!.name} to ${model.stations.get(t.toStationId)!.name}` : `Change at ${model.stations.get(t.stationId)!.name}`}</strong><span>{model.lines.get(t.fromLineId)!.name} → {model.lines.get(t.toLineId)!.name} · {t.minutes} min</span>{t.toStationId && <span>Walking connection; allow time for exit, entry and ticketing where required.</span>}</div>)}
    <details><summary>Full station sequence ({route.stationIds.length})</summary><ol>{route.stationIds.map((id,i) => <li key={`${id}-${i}`}>{model.stations.get(id)!.name}</li>)}</ol></details>
  </section>;
}
