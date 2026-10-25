import { useEffect, useId, useRef, useState } from 'react';
import type { NetworkModel } from '../models/network';
import { stationSearch } from '../algorithms/stationSearch';
export function StationSearch({ label, model, selectedId, onSelect }: { label: string; model: NetworkModel; selectedId: string | null; onSelect: (id: string | null) => void }) {
  const id = useId(), [query, setQuery] = useState(''), [open, setOpen] = useState(false), [active, setActive] = useState(0);
  const editing = useRef(false);
  useEffect(() => { if (editing.current) { editing.current = false; return; } setQuery(selectedId ? model.stations.get(selectedId)!.name : ''); }, [selectedId, model]);
  const matches = stationSearch(model.data.stations, query);
  const choose = (sid: string) => { onSelect(sid); setQuery(model.stations.get(sid)!.name); setOpen(false); };
  return <div className="station-search" onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}>
    <label htmlFor={id}>{label}</label>
    <input id={id} role="combobox" aria-expanded={open} aria-controls={`${id}-list`} aria-autocomplete="list" aria-activedescendant={open && matches[active] ? `${id}-${active}` : undefined} autoComplete="off" placeholder="Search station or code" value={query}
      onFocus={() => { setOpen(true); setActive(0); }} onChange={e => { if (selectedId) editing.current = true; onSelect(null); setQuery(e.target.value); setOpen(true); setActive(0); }}
      onKeyDown={e => { if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive(i => Math.min(i + 1, matches.length - 1)); } if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(0, i - 1)); } if (e.key === 'Enter' && open && matches[active]) { e.preventDefault(); choose(matches[active].id); } if (e.key === 'Escape') setOpen(false); }} />
    {open && <ul id={`${id}-list`} className="suggestions" role="listbox" aria-label={`${label} stations`}>
      {matches.map((s, i) => <li id={`${id}-${i}`} role="option" aria-selected={i === active} key={s.id} onMouseDown={e => e.preventDefault()} onClick={() => choose(s.id)}><strong>{s.name}</strong><span>{s.code} · {s.lineIds.map(l => model.lines.get(l)!.name.replace(' Line', '')).join(' / ')}</span></li>)}
      {!matches.length && <li role="presentation">No matching station found. Try a different name or code.</li>}
    </ul>}
  </div>;
}
