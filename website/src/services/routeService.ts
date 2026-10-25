import { z } from 'zod';
import type { RouteResult } from '../models/RouteResult';
import { requestJson } from './api';

export type RouteOutcome = { status: 'success'; route: RouteResult } | { status: 'error' | 'no-route'; message: string };

const routeSchema = z.object({
  sourceId: z.string(), destinationId: z.string(), stationIds: z.array(z.string()), connectionIds: z.array(z.string()),
  segments: z.array(z.object({ lineId: z.string(), stationIds: z.array(z.string()), connectionIds: z.array(z.string()), minutes: z.number().finite().nonnegative() })),
  interchanges: z.array(z.object({ stationId: z.string(), toStationId: z.string().optional(), fromLineId: z.string(), toLineId: z.string(), minutes: z.number().finite().positive(), transferId: z.string() })),
  totalTravelTime: z.number().finite().nonnegative(), rideMinutes: z.number().finite().nonnegative(),
  transferMinutes: z.number().finite().nonnegative(), interchangeCount: z.number().int().nonnegative(),
});
const outcomeSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('success'), route: routeSchema }),
  z.object({ status: z.literal('error'), message: z.string() }),
  z.object({ status: z.literal('no-route'), message: z.string() }),
]);

export async function findRoute(sourceId: string | null, destinationId: string | null, networkVersion: string): Promise<RouteOutcome> {
  if (!sourceId || !destinationId) return { status: 'error', message: 'Select both a source and a destination.' };
  try {
    const { response, data } = await requestJson('/api/routes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceId, destinationId, networkVersion }),
    });
    const outcome = outcomeSchema.parse(data);
    if (!response.ok && outcome.status === 'success') throw new Error('Unexpected route response');
    return outcome;
  } catch {
    return { status: 'error', message: 'The route service is unavailable. Please try again.' };
  }
}
