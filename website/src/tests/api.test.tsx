import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import data from './fixtures/sample-network.json';
import { validateNetwork } from '../data/validateNetwork';
import { loadNetwork } from '../data/loader';
import { findRoute } from '../services/routeService';
import App from '../App';

describe('Flask API integration', () => {
  it('loads and validates the network from Flask', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(data)));
    vi.stubGlobal('fetch', fetcher);
    expect((await loadNetwork()).data.version).toBe(data.version);
    expect(fetcher).toHaveBeenCalledWith('/api/network', expect.any(Object));
  });
  it('sends route requests to Flask with the loaded network version', async () => {
    const route = { sourceId: 'new-delhi', destinationId: 'rk-ashram', stationIds: ['new-delhi', 'rajiv-chowk', 'rk-ashram'], connectionIds: ['yellow-new-delhi-rajiv-chowk', 'blue-rk-ashram-rajiv-chowk'], segments: [{ lineId: 'yellow', stationIds: ['new-delhi', 'rajiv-chowk'], connectionIds: ['yellow-new-delhi-rajiv-chowk'], minutes: 2 }, { lineId: 'blue', stationIds: ['rajiv-chowk', 'rk-ashram'], connectionIds: ['blue-rk-ashram-rajiv-chowk'], minutes: 2 }], interchanges: [{ stationId: 'rajiv-chowk', fromLineId: 'yellow', toLineId: 'blue', minutes: 4, transferId: 'transfer-rajiv-chowk-yellow-blue' }], totalTravelTime: 8, rideMinutes: 4, transferMinutes: 4, interchangeCount: 1 };
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'success', route })));
    vi.stubGlobal('fetch', fetcher);
    expect(await findRoute('new-delhi', 'rk-ashram', data.version)).toMatchObject({ status: 'success', route: { totalTravelTime: 8 } });
    expect(fetcher).toHaveBeenCalledWith('/api/routes', expect.objectContaining({ method: 'POST', body: JSON.stringify({ sourceId: 'new-delhi', destinationId: 'rk-ashram', networkVersion: data.version }) }));
  });
  it('shows results after loading the Flask network and posting a route', async () => {
    const route = { sourceId: 'new-delhi', destinationId: 'rk-ashram', stationIds: ['new-delhi', 'rajiv-chowk', 'rk-ashram'], connectionIds: ['yellow-new-delhi-rajiv-chowk', 'blue-rk-ashram-rajiv-chowk'], segments: [{ lineId: 'yellow', stationIds: ['new-delhi', 'rajiv-chowk'], connectionIds: ['yellow-new-delhi-rajiv-chowk'], minutes: 2 }, { lineId: 'blue', stationIds: ['rajiv-chowk', 'rk-ashram'], connectionIds: ['blue-rk-ashram-rajiv-chowk'], minutes: 2 }], interchanges: [{ stationId: 'rajiv-chowk', fromLineId: 'yellow', toLineId: 'blue', minutes: 4, transferId: 'transfer-rajiv-chowk-yellow-blue' }], totalTravelTime: 8, rideMinutes: 4, transferMinutes: 4, interchangeCount: 1 };
    const fetcher = vi.fn(async (url: string) => url === '/api/network'
      ? new Response(JSON.stringify(data))
      : new Response(JSON.stringify({ status: 'success', route })));
    vi.stubGlobal('fetch', fetcher);
    render(<App/>);
    expect(await screen.findByRole('combobox', { name: 'From' })).toBeVisible();
    expect(fetcher).toHaveBeenCalledWith('/api/network', expect.any(Object));
  });
  it('returns a controlled error when Flask sends an invalid response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"unexpected":true}')));
    expect(await findRoute('new-delhi', 'rk-ashram', data.version)).toMatchObject({ status: 'error', message: expect.stringContaining('unavailable') });
  });
});
