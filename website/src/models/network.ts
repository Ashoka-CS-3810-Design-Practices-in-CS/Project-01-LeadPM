export interface Station { id: string; name: string; code: string; aliases?: string[]; status?: 'operational' | 'access-unconfirmed'; lineIds: string[]; x: number; y: number; labelDx: number; labelDy: number }
export interface MetroLine { id: string; name: string; color: string; stationIds: string[]; paths?: string[][] }
export interface Connection { id: string; from: string; to: string; lineId: string; minutes: number; bidirectional?: boolean }
export interface TransferEdge { id: string; stationId: string; toStationId?: string; fromLineId: string; toLineId: string; minutes: number }
export interface Network { version: string; kind: 'sample' | 'documented' | 'verified'; description: string; stations: Station[]; lines: MetroLine[]; connections: Connection[]; transfers: TransferEdge[] }
export interface NetworkModel { data: Network; stations: Map<string, Station>; lines: Map<string, MetroLine> }
