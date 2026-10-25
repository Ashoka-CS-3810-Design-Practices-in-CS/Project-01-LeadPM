"""Pure Python graph and routing logic; no Flask or presentation imports."""
from dataclasses import dataclass, replace
import math


class MinHeap:
    """Indexed binary heap: one active entry per station-line state."""
    def __init__(self):
        self.entries = []
        self.positions = {}

    def __bool__(self):
        return bool(self.entries)

    def _swap(self, a, b):
        self.entries[a], self.entries[b] = self.entries[b], self.entries[a]
        self.positions[self.entries[a][1]] = a
        self.positions[self.entries[b][1]] = b

    def set(self, key, priority):
        if not math.isfinite(priority):
            raise ValueError("Route cost exceeds supported numeric range")
        i = self.positions.get(key)
        if i is None:
            i = len(self.entries)
            self.entries.append((priority, key))
            self.positions[key] = i
        elif priority >= self.entries[i][0]:
            return
        else:
            self.entries[i] = (priority, key)
        while i:
            parent = (i - 1) // 2
            if self.entries[parent] <= self.entries[i]:
                break
            self._swap(parent, i)
            i = parent

    def pop(self):
        first, last = self.entries[0], self.entries.pop()
        del self.positions[first[1]]
        if self.entries:
            self.entries[0] = last
            self.positions[last[1]] = 0
            i = 0
            while True:
                smallest = i
                for child in (2 * i + 1, 2 * i + 2):
                    if child < len(self.entries) and self.entries[child] < self.entries[smallest]:
                        smallest = child
                if smallest == i:
                    break
                self._swap(i, smallest)
                i = smallest
        return first


@dataclass(frozen=True)
class GraphEdge:
    id: str
    start: str
    end: str
    minutes: float
    kind: str
    line_id: str | None = None


class Graph:
    def __init__(self, model):
        self.nodes, self.adjacency, self.station_states = {}, {}, {}
        for station in model.stations.values():
            states = []
            for line in station["lineIds"]:
                key = f'{station["id"]}|{line}'
                self.nodes[key] = (station["id"], line)
                self.adjacency[key] = []
                states.append(key)
            self.station_states[station["id"]] = states
        for e in model.data["connections"]:
            self._add(GraphEdge(e["id"], f'{e["from"]}|{e["lineId"]}', f'{e["to"]}|{e["lineId"]}', e["minutes"], "travel", e["lineId"]), e.get('bidirectional', True))
        for e in model.data["transfers"]:
            self._add(GraphEdge(e["id"], f'{e["stationId"]}|{e["fromLineId"]}', f'{e.get("toStationId", e["stationId"])}|{e["toLineId"]}', e["minutes"], "transfer"))

    def _add(self, edge, bidirectional=True):
        self.adjacency[edge.start].append(edge)
        if bidirectional:
            self.adjacency[edge.end].append(replace(edge, start=edge.end, end=edge.start))


def dijkstra(graph, source, destination):
    distances, previous, settled, queue = {}, {}, set(), MinHeap()
    for state in graph.station_states[source]:
        distances[state] = 0
        queue.set(state, 0)
    while queue:
        cost, state = queue.pop()
        settled.add(state)
        if graph.nodes[state][0] == destination:
            return state, cost, previous
        for edge in graph.adjacency[state]:
            if edge.end in settled:
                continue
            candidate = cost + edge.minutes
            if not math.isfinite(candidate):
                raise ValueError("Route cost exceeds supported numeric range")
            if candidate < distances.get(edge.end, math.inf):
                distances[edge.end] = candidate
                previous[edge.end] = edge
                queue.set(edge.end, candidate)
    return None


def reconstruct_route(graph, source, destination, path):
    state, cost, previous = path
    edges = []
    while state in previous:
        edge = previous[state]
        edges.append(edge)
        state = edge.start
    stations, connections, segments, interchanges = [source], [], [], []
    current, ride, transfer = None, 0, 0
    for edge in reversed(edges):
        start_station, start_line = graph.nodes[edge.start]
        end_station, end_line = graph.nodes[edge.end]
        if edge.kind == "transfer":
            interchanges.append(dict(stationId=start_station, fromLineId=start_line, toLineId=end_line, minutes=edge.minutes, transferId=edge.id))
            if start_station != end_station:
                interchanges[-1]['toStationId'] = end_station
                stations.append(end_station)
            transfer += edge.minutes
            current = None
        else:
            if current is None:
                current = dict(lineId=edge.line_id, stationIds=[start_station], connectionIds=[], minutes=0)
                segments.append(current)
            current["stationIds"].append(end_station)
            current["connectionIds"].append(edge.id)
            current["minutes"] += edge.minutes
            stations.append(end_station)
            connections.append(edge.id)
            ride += edge.minutes
    return dict(sourceId=source, destinationId=destination, stationIds=stations, connectionIds=connections,
                segments=segments, interchanges=interchanges, totalTravelTime=cost, rideMinutes=ride,
                transferMinutes=transfer, interchangeCount=len(interchanges))


class RouteService:
    def __init__(self, model):
        self.model = model
        self.graph = Graph(model)

    def find(self, source, destination):
        if not source or not destination:
            return dict(status="error", message="Select both a source and a destination.")
        if not isinstance(source, str) or not isinstance(destination, str):
            return dict(status="error", message="Station IDs must be strings.")
        if source not in self.model.stations or destination not in self.model.stations:
            return dict(status="error", message="Unknown station. Choose a station from the results.")
        if source == destination:
            return dict(status="error", message="Source and destination must be different.")
        if any(self.model.stations[s].get('status') == 'access-unconfirmed' for s in (source, destination)):
            return dict(status='error', message='Passenger access at this station is not yet verified in this dataset. Choose a nearby station.')
        path = dijkstra(self.graph, source, destination)
        if path is None:
            return dict(status="no-route", message="No available route between the selected stations.")
        return dict(status="success", route=reconstruct_route(self.graph, source, destination, path))
