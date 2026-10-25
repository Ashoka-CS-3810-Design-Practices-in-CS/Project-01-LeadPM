import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import data from './fixtures/sample-network.json';
import { validateNetwork } from '../data/validateNetwork';
import { buildGraph } from '../graph/buildGraph';
import { stateId } from '../graph/Graph';
import { createRouteService } from '../services/routeService';
import { loadNetwork } from '../data/loader';
import App from '../App';

const model = validateNetwork(data);
describe('standalone website data and routing', () => {
  it('loads and validates the bundled network asset', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(data)));
    vi.stubGlobal('fetch', fetcher);
    expect((await loadNetwork()).data.version).toBe(data.version);
    expect(fetcher).toHaveBeenCalledWith(`${import.meta.env.BASE_URL}metro-network.json`, expect.any(Object));
  });
  it('calculates the documented interchange route in the browser', () => {
    const result = createRouteService(model).find('new-delhi', 'rk-ashram');
    expect(result).toMatchObject({ status: 'success', route: { totalTravelTime: 8, stationIds: ['new-delhi', 'rajiv-chowk', 'rk-ashram'] } });
  });
  it('rejects a directed connection in the reverse direction', () => {
    const directed = structuredClone(model.data);
    directed.connections[0].bidirectional = false;
    const graph = buildGraph(validateNetwork(directed));
    const edge = directed.connections[0];
    expect(graph.adjacency.get(stateId(edge.from, edge.lineId))?.some(item => item.id === edge.id)).toBe(true);
    expect(graph.adjacency.get(stateId(edge.to, edge.lineId))?.some(item => item.id === edge.id)).toBe(false);
  });
  it('reports access-unconfirmed endpoints without calculating a route', () => {
    const network = structuredClone(model.data);
    network.stations.find(station => station.id === 'new-delhi')!.status = 'access-unconfirmed';
    expect(createRouteService(validateNetwork(network)).find('new-delhi', 'rk-ashram')).toMatchObject({ status: 'error', message: expect.stringContaining('Passenger access') });
  });
  it('loads the planner UI from the bundled network', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(data))));
    render(<App/>);
    expect(await screen.findByRole('combobox', { name: 'From' })).toBeVisible();
  });
});
