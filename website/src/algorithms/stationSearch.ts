import type { Station } from '../models/network';
const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
/** Three stable buckets avoid sorting and preserve dataset order within a rank. */
export function stationSearch(stations: Station[], query: string): Station[] {
  const q = normalize(query); if (!q) return stations;
  const buckets: Station[][] = [[], [], []];
  for (const s of stations) {
    const names = [s.name,s.code,...s.aliases ?? []].map(normalize);
    if (names.some(n => n === q)) buckets[0].push(s);
    else if (names.some(n => n.startsWith(q))) buckets[1].push(s);
    else if (names.some(n => n.includes(q))) buckets[2].push(s);
  }
  return buckets.flat();
}
