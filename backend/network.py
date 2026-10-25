"""Validate the versioned network before accepting requests."""
from copy import deepcopy
from dataclasses import dataclass
import math
import re


def require(condition, message):
    if not condition:
        raise ValueError(f"Invalid network: {message}")


def identifier(value):
    return isinstance(value, str) and re.fullmatch(r"[a-z][a-z0-9-]*", value)


def finite(value):
    return type(value) in (int, float) and math.isfinite(value)


@dataclass(frozen=True)
class NetworkModel:
    data: dict
    stations: dict
    lines: dict


def validate_network(raw):
    require(isinstance(raw, dict), "expected an object")
    data = deepcopy(raw)
    for key in ("version", "description"):
        require(isinstance(data.get(key), str) and data[key].strip(), key)
    require(data.get("kind") in ("sample", "documented", "verified"), "kind")
    for key in ("stations", "lines", "connections", "transfers"):
        require(isinstance(data.get(key), list), key)
        require(all(isinstance(record, dict) for record in data[key]), f"{key} records")
    require(data["stations"] and data["lines"], "empty network")

    def records(items, fields):
        for item in items:
            for field in fields:
                require(identifier(item.get(field)), f"invalid {field}")

    records(data["stations"], ("id",))
    records(data["lines"], ("id",))
    records(data["connections"], ("id", "from", "to", "lineId"))
    records(data["transfers"], ("id", "stationId", "fromLineId", "toLineId"))

    def unique(values, label):
        require(len(set(values)) == len(values), f"duplicate {label}")

    unique([s["id"] for s in data["stations"]], "station ID")
    unique([s["id"] for s in data["lines"]], "line ID")
    unique([e["id"] for e in data["connections"] + data["transfers"]], "edge ID")
    stations = {s["id"]: s for s in data["stations"]}
    lines = {line["id"]: line for line in data["lines"]}
    memberships = set()
    for s in stations.values():
        require(s.get('status', 'operational') in ('operational', 'access-unconfirmed'), 'station status')
        for field in ("name", "code"):
            require(isinstance(s.get(field), str) and s[field].strip(), field)
        for field in ("x", "y", "labelDx", "labelDy"):
            require(finite(s.get(field)), field)
        ids = s.get("lineIds")
        require(isinstance(ids, list) and ids and all(identifier(x) for x in ids), "lineIds")
        unique(ids, "station membership")
        for line_id in ids:
            require(line_id in lines, "unknown line")
            memberships.add((s["id"], line_id))
    unique([s["code"].lower() for s in stations.values()], "station code")
    ordered, adjacent = set(), set()
    for line in lines.values():
        require(isinstance(line.get("name"), str) and line["name"].strip(), "line name")
        require(isinstance(line.get("color"), str) and re.fullmatch(r"#[0-9a-fA-F]{6}", line["color"]), "line color")
        ids = line.get("stationIds")
        require(isinstance(ids, list) and ids and all(identifier(x) for x in ids), "stationIds")
        unique(ids, "line station")
        for station_id in ids:
            require((station_id, line["id"]) in memberships, "inconsistent membership")
            ordered.add((station_id, line["id"]))
        paths = line.get('paths', [ids])
        id_set = set(ids)
        require(isinstance(paths, list) and paths, 'line paths')
        covered = set()
        for path in paths:
            require(isinstance(path, list) and len(path) >= 1 and all(identifier(x) and x in id_set for x in path), 'path stations')
            covered.update(path)
            for a, b in zip(path, path[1:]):
                require(a != b, 'path self loop')
                adjacent.add((line['id'], *sorted((a, b))))
        require(covered == id_set, 'path coverage')
    require(ordered == memberships, "missing ordered membership")
    seen = set()
    for edge in data["connections"]:
        require(type(edge.get('bidirectional', True)) is bool, 'connection direction')
        require(finite(edge.get("minutes")) and edge["minutes"] >= 0, "ride minutes")
        key = (edge["lineId"], *sorted((edge["from"], edge["to"])))
        require(edge["from"] != edge["to"] and key in adjacent and key not in seen, "connection")
        seen.add(key)
    require(seen == adjacent, "missing adjacent connection")
    seen = set()
    for edge in data["transfers"]:
        require(finite(edge.get("minutes")) and edge["minutes"] > 0, "transfer minutes")
        station, a, b = edge["stationId"], edge["fromLineId"], edge["toLineId"]
        target = edge.get('toStationId', station)
        require(identifier(target), 'transfer target')
        key = tuple(sorted(((station, a), (target, b))))
        require(a != b and (station, a) in memberships and (target, b) in memberships and key not in seen, "transfer")
        seen.add(key)
    return NetworkModel(data, stations, lines)
