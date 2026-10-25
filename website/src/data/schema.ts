import { z } from 'zod';
const id = z.string().regex(/^[a-z][a-z0-9-]*$/);
const minutes = z.number().finite().nonnegative();
export const networkSchema = z.object({
  version: z.string().min(1), kind: z.enum(['sample', 'documented', 'verified']), description: z.string().min(1),
  stations: z.array(z.object({ id, name: z.string().min(1), code: z.string().min(1), aliases: z.array(z.string()).optional(), status: z.enum(['operational','access-unconfirmed']).optional(), lineIds: z.array(id).min(1), x: z.number().finite(), y: z.number().finite(), labelDx: z.number().finite(), labelDy: z.number().finite() })).min(1),
  lines: z.array(z.object({ id, name: z.string().min(1), color: z.string().regex(/^#[0-9a-fA-F]{6}$/), stationIds: z.array(id).min(1), paths: z.array(z.array(id).min(1)).min(1).optional() })).min(1),
  connections: z.array(z.object({ id, from: id, to: id, lineId: id, minutes, bidirectional: z.boolean().optional() })),
  transfers: z.array(z.object({ id, stationId: id, toStationId: id.optional(), fromLineId: id, toLineId: id, minutes: minutes.positive() })),
});
