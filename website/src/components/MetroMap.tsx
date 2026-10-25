import { useEffect, useMemo, useRef, useState } from 'react';
import { select } from 'd3-selection';
import { zoom, zoomIdentity, type ZoomBehavior } from 'd3-zoom';
import type { NetworkModel } from '../models/network';
import type { RouteResult } from '../models/RouteResult';

export function MetroMap({ model, route, sourceId, destinationId, onSelect }: { model: NetworkModel; route: RouteResult | null; sourceId: string | null; destinationId: string | null; onSelect: (id: string) => void }) {
  const svgRef = useRef<SVGSVGElement>(null), groupRef = useRef<SVGGElement>(null), behavior = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [inspected, setInspected] = useState<string | null>(null), [zoomLevel,setZoomLevel] = useState(1), [lineFilter,setLineFilter] = useState('all');
  const full = model.data.stations.length > 50;
  const bounds = useMemo(() => full ? [Math.max(...model.data.stations.map(s=>s.x))+100, Math.max(...model.data.stations.map(s=>s.y))+80] : [1040,730], [model,full]);
  useEffect(() => {
    const svg = select(svgRef.current!);
    const z = zoom<SVGSVGElement, unknown>().extent([[0, 0], [bounds[0], bounds[1]]]).scaleExtent([1, full ? 10 : 3]).translateExtent([[0, 0], [bounds[0], bounds[1]]]).on('zoom', event => {
      select(groupRef.current!).attr('transform', event.transform.toString()); setZoomLevel(event.transform.k);
    });
    behavior.current = z; svg.call(z).on('dblclick.zoom', null);
    return () => { svg.on('.zoom', null); };
  }, [bounds, full]);
  const links = new Set(route?.connectionIds), stations = new Set(route?.stationIds), routeTransfers = new Set(route?.interchanges.map(t=>t.transferId));
  const info = inspected ? model.stations.get(inspected) : null;
  const scale = (factor: number) => { if (behavior.current) select(svgRef.current!).call(behavior.current.scaleBy, factor); };
  const fitRoute = () => {
    if (!route || !behavior.current) return;
    const points=route.stationIds.map(id=>model.stations.get(id)!);
    const minX=Math.min(...points.map(s=>s.x))-70, maxX=Math.max(...points.map(s=>s.x))+70;
    const minY=Math.min(...points.map(s=>s.y))-70, maxY=Math.max(...points.map(s=>s.y))+70;
    const k=Math.max(1,Math.min(8,bounds[0]/(maxX-minX),bounds[1]/(maxY-minY)));
    const tx=Math.min(0,Math.max(bounds[0]*(1-k),bounds[0]/2-(minX+maxX)/2*k));
    const ty=Math.min(0,Math.max(bounds[1]*(1-k),bounds[1]/2-(minY+maxY)/2*k));
    select(svgRef.current!).call(behavior.current.transform,zoomIdentity.translate(tx,ty).scale(k));
  };
  const focusStation = (id: string) => {
    setInspected(id); onSelect(id);
    if (full && behavior.current) {
      const station=model.stations.get(id)!;
      const k=3; const tx=Math.min(0,Math.max(bounds[0]*(1-k),bounds[0]/2-station.x*k)), ty=Math.min(0,Math.max(bounds[1]*(1-k),bounds[1]/2-station.y*k));
      select(svgRef.current!).call(behavior.current.transform,zoomIdentity.translate(tx,ty).scale(k));
    }
  };
  return <section className="map-panel" aria-label="Metro network map"><div className="map-heading"><div><div className="eyebrow">EXPLORE THE NETWORK</div><h2>Delhi NCR, connected.</h2></div><span className="sample-pill">{model.data.stations.length} STATIONS · {model.data.lines.length} LINES</span></div>
    {full && <div className="network-filter"><label htmlFor="map-line">Browse a line</label><select id="map-line" value={lineFilter} onChange={e=>setLineFilter(e.target.value)}><option value="all">All metro lines</option>{model.data.lines.map(l=><option key={l.id} value={l.id}>{l.name} ({l.stationIds.length})</option>)}</select><span>Zoom in for station names</span></div>}
    <div className={`map-canvas ${full ? 'full-network' : ''}`}><svg ref={svgRef} viewBox={`0 0 ${bounds[0]} ${bounds[1]}`} aria-label="Interactive schematic of the Delhi NCR Metro network"><title>Metro network. Focus a station and press Enter to select it.</title><g ref={groupRef}>
      {model.data.connections.map(c => { const a = model.stations.get(c.from)!, b = model.stations.get(c.to)!; return <line key={c.id} data-connection-id={c.id} data-highlighted={links.has(c.id)} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={model.lines.get(c.lineId)!.color} strokeWidth={links.has(c.id) ? 9 : full ? 5 : 6} strokeOpacity={route && !links.has(c.id) || lineFilter !== 'all' && c.lineId !== lineFilter ? .14 : 1} strokeLinecap="round"/>; })}
      {model.data.transfers.filter(t=>t.toStationId).map(t=>{const a=model.stations.get(t.stationId)!,b=model.stations.get(t.toStationId!)!;return <line key={t.id} data-walk-id={t.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={routeTransfers.has(t.id)?'#15373b':'#718078'} strokeWidth={routeTransfers.has(t.id)?6:3} strokeDasharray="6 4"><title>Walk between {a.name} and {b.name}</title></line>;})}
      {model.data.stations.map(s => { const endpoint = sourceId === s.id ? 'A' : destinationId === s.id ? 'B' : null; const showLabel=!full || zoomLevel>=2.5 || endpoint || inspected===s.id; const dim=lineFilter!=='all'&&!s.lineIds.includes(lineFilter); return <g key={s.id} role="button" tabIndex={0} data-station-id={s.id} aria-label={`${s.name}, ${s.lineIds.map(l => model.lines.get(l)!.name).join(', ')}${s.lineIds.length > 1 ? ', interchange' : ''}`} onFocus={() => setInspected(s.id)} onMouseEnter={() => setInspected(s.id)} onClick={() => { setInspected(s.id); onSelect(s.id); }} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(s.id); } }} className="map-station" opacity={dim ? .25 : 1}>
        <circle cx={s.x} cy={s.y} r={endpoint ? 16 : s.lineIds.length > 1 ? full ? 6 : 10 : full ? 3.5 : 6} fill={endpoint ? '#173d40' : s.status==='access-unconfirmed' ? '#fff0c4' : 'white'} stroke={stations.has(s.id) || endpoint ? '#173d40' : '#657c80'} strokeWidth={s.lineIds.length > 1 ? 3 : 1.5}/>
        {endpoint && <text x={s.x} y={s.y + 5} textAnchor="middle" className="endpoint-label">{endpoint}</text>}
        {showLabel && <text x={s.x + s.labelDx} y={s.y + s.labelDy} style={full && (endpoint || inspected===s.id) ? {fontSize:22 / Math.sqrt(zoomLevel)} : undefined} className={`station-label ${s.lineIds.length > 1 ? 'interchange-label' : ''}`}>{s.name}</text>}
        <title>{s.name} · {s.lineIds.map(l => model.lines.get(l)!.name).join(' / ')}{s.status==='access-unconfirmed'?' · Passenger access unconfirmed':''}</title>
      </g>; })}
    </g></svg><div className="map-tools"><button aria-label="Zoom in" onClick={() => scale(1.3)}>+</button><button aria-label="Zoom out" onClick={() => scale(1 / 1.3)}>−</button><button onClick={() => { if (behavior.current) select(svgRef.current!).call(behavior.current.transform, zoomIdentity); }}>Reset view</button>{full && <button disabled={!route} onClick={fitRoute}>Fit route</button>}</div></div>
    <div className="map-footer"><div className="legend">{model.data.lines.map(l => <span key={l.id}><i style={{ background: l.color }}/>{l.name}</span>)}</div><p>{info ? `${info.name} · ${info.lineIds.map(l => model.lines.get(l)!.name).join(' / ')}${info.status==='access-unconfirmed'?' · Passenger access unconfirmed':''}` : 'Click a station to select it · Scroll to zoom · Drag to pan'}</p><small>Schematic · A: source · B: destination · Ring: interchange · Dotted link: walk</small>
    {full && <details className="station-directory"><summary>All stations ({model.data.stations.filter(s=>lineFilter==='all'||s.lineIds.includes(lineFilter)).length})</summary><p>Choose a station to select it and locate it on the map. Soorghat is listed with passenger access unconfirmed.</p><div>{model.data.stations.filter(s=>lineFilter==='all'||s.lineIds.includes(lineFilter)).map(s=><button key={s.id} onClick={()=>focusStation(s.id)}>{s.name}{s.status==='access-unconfirmed'?' (check access)':''}</button>)}</div></details>}
    </div>
  </section>;
}
