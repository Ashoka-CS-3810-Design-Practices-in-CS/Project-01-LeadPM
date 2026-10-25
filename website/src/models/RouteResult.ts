export interface RouteSegment { lineId: string; stationIds: string[]; connectionIds: string[]; minutes: number }
export interface InterchangeInstruction { stationId: string; toStationId?: string; fromLineId: string; toLineId: string; minutes: number; transferId: string }
export interface RouteResult {
  sourceId: string; destinationId: string; stationIds: string[]; connectionIds: string[];
  segments: RouteSegment[]; interchanges: InterchangeInstruction[];
  totalTravelTime: number; rideMinutes: number; transferMinutes: number; interchangeCount: number;
}
