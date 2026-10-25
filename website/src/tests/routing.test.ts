import { describe, expect, it } from 'vitest';
import data from './fixtures/sample-network.json';
import { validateNetwork } from '../data/validateNetwork';
import { createRouteService } from './referenceRouteService';
import { MinHeap } from '../graph/MinHeap';
import { stationSearch } from '../algorithms/stationSearch';
import { initialRouteState, routeReducer } from '../state/routeReducer';
const model = validateNetwork(data), service = createRouteService(model);
function route(from: string, to: string) { const result = service.find(from, to); if (result.status !== 'success') throw new Error('Expected route'); return result.route; }
describe('indexed min heap', () => {
  it('decreases a key without duplication and preserves order through mixed operations', () => {
    const h = new MinHeap(); h.set('a', 12); h.set('b', 5); h.set('c', 8); h.set('a', 1); h.set('b', 20);
    expect(h.size).toBe(3); expect(h.pop()).toEqual({ key: 'a', priority: 1 }); h.set('d', 2);
    expect([h.pop()?.key,h.pop()?.key,h.pop()?.key,h.pop()]).toEqual(['d','b','c',undefined]);
  });
  it('matches sorted priorities for 100 decreased keys', () => {
    const h = new MinHeap(); for (let i=0;i<100;i++) h.set(`k${i}`, 1000+i);
    for (let i=99;i>=0;i--) h.set(`k${i}`, i);
    expect(Array.from({length:100}, () => h.pop()!.priority)).toEqual(Array.from({length:100}, (_,i)=>i));
  });
});
describe('graph and routes', () => {
  it('expands line states and both directions without free switches', () => {
    expect(service.graph.nodes.size).toBe(data.stations.reduce((n,s)=>n+s.lineIds.length,0));
    expect([...service.graph.adjacency.values()].flat().length).toBe(2*(data.connections.length+data.transfers.length));
    const kg=service.graph.adjacency.get('kashmere-gate|red')!;
    expect(kg.filter(e=>e.kind==='transfer').map(e=>e.minutes)).toEqual([4,4]);
  });
  it('finds same-line route through an interchange without reporting a change', () => {
    const r=route('new-delhi','patel-chowk'); expect(r.totalTravelTime).toBe(4); expect(r.stationIds).toEqual(['new-delhi','rajiv-chowk','patel-chowk']); expect(r.interchanges).toEqual([]);
  });
  it('charges one actual interchange and reconstructs stable travel IDs', () => {
    const r=route('new-delhi','rk-ashram'); expect(r.totalTravelTime).toBe(8); expect(r.rideMinutes).toBe(4); expect(r.transferMinutes).toBe(4);
    expect(r.stationIds).toEqual(['new-delhi','rajiv-chowk','rk-ashram']); expect(r.segments.map(s=>s.lineId)).toEqual(['yellow','blue']);
    expect(r.interchanges[0]).toMatchObject({stationId:'rajiv-chowk',fromLineId:'yellow',toLineId:'blue',minutes:4});
    expect(r.connectionIds).toEqual(['yellow-new-delhi-rajiv-chowk','blue-rk-ashram-rajiv-chowk']);
  });
  it('finds a route with two interchanges', () => {
    const r=route('pul-bangash','rk-ashram'); expect(r.totalTravelTime).toBe(24); expect(r.interchanges.map(t=>t.stationId)).toEqual(['kashmere-gate','rajiv-chowk']);
  });
  it('does not charge for initial boarding or exiting at an interchange', () => {
    expect(route('rajiv-chowk','rk-ashram').totalTravelTime).toBe(2); expect(route('rk-ashram','rajiv-chowk').interchangeCount).toBe(0);
  });
  it('preserves A1 same-station rejection and validates missing/unknown selections', () => {
    expect(service.find('new-delhi','new-delhi')).toMatchObject({status:'error',message:'Source and destination must be different.'});
    expect(service.find(null,'new-delhi').status).toBe('error'); expect(service.find('fiction','new-delhi').status).toBe('error');
  });
  it('returns no-route for disconnected components', () => {
    const disconnected=structuredClone(data); disconnected.transfers=[];
    expect(createRouteService(validateNetwork(disconnected)).find('pul-bangash','rk-ashram').status).toBe('no-route');
  });
  it('chooses a different path when transfer cost makes the shortest ride slower', () => {
    const changed=structuredClone(data); changed.transfers.find(t=>t.id==='transfer-rajiv-chowk-yellow-blue')!.minutes=100;
    const result=createRouteService(validateNetwork(changed)).find('new-delhi','rk-ashram');
    expect(result.status).toBe('success'); if(result.status==='success') {expect(result.route.totalTravelTime).toBe(24); expect(result.route.interchanges.map(t=>t.stationId)).toEqual(['central-secretariat','mandi-house']);}
  });
  it('agrees with an independent Floyd-Warshall oracle for every sample station pair', () => {
    const ids=[...service.graph.nodes.keys()], n=ids.length, idx=new Map(ids.map((id,i)=>[id,i]));
    const distances=Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>i===j?0:Infinity));
    for(const edges of service.graph.adjacency.values()) for(const e of edges) distances[idx.get(e.from)!][idx.get(e.to)!]=e.minutes;
    for(let k=0;k<n;k++) for(let i=0;i<n;i++) for(let j=0;j<n;j++) distances[i][j]=Math.min(distances[i][j],distances[i][k]+distances[k][j]);
    for(const a of data.stations) for(const b of data.stations) if(a.id!==b.id) {
      const expected=Math.min(...service.graph.stationStates.get(a.id)!.flatMap(s=>service.graph.stationStates.get(b.id)!.map(t=>distances[idx.get(s)!][idx.get(t)!])));
      const r=route(a.id,b.id); expect(r.totalTravelTime).toBe(expected); expect(r.rideMinutes+r.transferMinutes).toBe(expected);
      expect(r.connectionIds.every(id=>data.connections.some(c=>c.id===id))).toBe(true);
    }
  });
});
describe('validation', () => {
  it.each(['connection','transfer'] as const)('rejects negative %s weights', kind=>{const bad=structuredClone(data); (kind==='connection'?bad.connections:bad.transfers)[0].minutes=-1; expect(()=>validateNetwork(bad)).toThrow();});
  it('rejects a free transfer',()=>{const bad=structuredClone(data); bad.transfers[0].minutes=0; expect(()=>validateNetwork(bad)).toThrow();});
  it('accepts zero travel times',()=>{const valid=structuredClone(data); valid.connections[0].minutes=0; expect(()=>validateNetwork(valid)).not.toThrow();});
  it.each(['missing station','duplicate ID','membership','non-adjacent edge','missing edge','invalid transfer','non-finite'] as const)('rejects %s',kind=>{
    const bad=structuredClone(data);
    if(kind==='missing station') bad.connections[0].from='missing';
    if(kind==='duplicate ID') bad.stations[1].id=bad.stations[0].id;
    if(kind==='membership') bad.stations[0].lineIds.push('blue');
    if(kind==='non-adjacent edge') bad.connections[0].to='shastri-park';
    if(kind==='missing edge') bad.connections.pop();
    if(kind==='invalid transfer') bad.transfers[0].stationId='pul-bangash';
    if(kind==='non-finite') bad.connections[0].minutes=Infinity;
    expect(()=>validateNetwork(bad)).toThrow();
  });
});
describe('search and UI state', () => {
  it('matches normalized station names, codes and substrings',()=>{expect(stationSearch(data.stations,'  rJC ')[0].id).toBe('rajiv-chowk'); expect(stationSearch(data.stations,'chowk')).toHaveLength(3); expect(stationSearch(data.stations,'unknown')).toEqual([]);});
  it('invalidates routes immediately and ignores stale asynchronous results after edits/reset',()=>{
    const r=route('new-delhi','rk-ashram'); const shown={...initialRouteState,route:r,status:'success' as const};
    const edited=routeReducer(shown,{type:'select',field:'destinationId',id:'ito'}); expect(edited.route).toBeNull();
    expect(routeReducer(edited,{type:'result',revision:0,outcome:{status:'success',route:r}})).toBe(edited);
    const cleared=routeReducer(edited,{type:'clear'}); expect(cleared.sourceId).toBeNull(); expect(cleared.destinationId).toBeNull(); expect(cleared.route).toBeNull();
    expect(routeReducer(cleared,{type:'result',revision:1,outcome:{status:'success',route:r}})).toBe(cleared);
  });
});
