from copy import deepcopy
import json
import math
from pathlib import Path

import pytest

from backend.app import ROOT, create_app
from backend.network import validate_network
from backend.routing import MinHeap, RouteService

DATA = json.loads((ROOT / "backend/tests/fixtures/sample-network.json").read_text(encoding="utf-8"))


@pytest.fixture
def app():
    return create_app({"TESTING": True, "NETWORK_PATH": ROOT / "backend/tests/fixtures/sample-network.json"})


@pytest.fixture
def client(app):
    return app.test_client()


def test_health_and_network(client):
    assert client.get('/api/health').json == dict(status='ok', networkVersion=DATA['version'], stations=22)
    response = client.get('/api/network')
    assert response.json == DATA
    assert response.headers['Cache-Control'] == 'no-store'


@pytest.mark.parametrize('source,destination,minutes,changes', [
    ('new-delhi', 'patel-chowk', 4, 0),
    ('new-delhi', 'rk-ashram', 8, 1),
    ('pul-bangash', 'rk-ashram', 24, 2),
    ('rajiv-chowk', 'rk-ashram', 2, 0),
    ('rk-ashram', 'rajiv-chowk', 2, 0),
])
def test_known_routes(client, source, destination, minutes, changes):
    response = client.post('/api/routes', json=dict(sourceId=source, destinationId=destination, networkVersion=DATA['version']))
    assert response.status_code == 200
    route = response.json['route']
    assert route['totalTravelTime'] == minutes
    assert route['rideMinutes'] + route['transferMinutes'] == minutes
    assert route['interchangeCount'] == changes
    assert route['stationIds'][0] == source and route['stationIds'][-1] == destination


@pytest.mark.parametrize('body', [None, [], 'text', {},
    dict(sourceId='new-delhi'), dict(sourceId='unknown', destinationId='ito'),
    dict(sourceId='new-delhi', destinationId='new-delhi'),
    dict(sourceId=['new-delhi'], destinationId='ito'),
    dict(sourceId={'id': 'new-delhi'}, destinationId='ito'),
    dict(sourceId=True, destinationId='ito'),
    dict(sourceId='new-delhi', destinationId='ito', unexpected=1),
])
def test_bad_request_bodies(client, body):
    response = client.post('/api/routes', data=json.dumps(body), content_type='application/json')
    assert response.status_code == 400
    assert response.json['status'] == 'error'


def test_transport_errors(client):
    assert client.post('/api/routes', data='{', content_type='application/json').status_code == 400
    assert client.post('/api/routes', data='text').status_code == 415
    assert client.post('/api/routes', data='x' * 5000, content_type='application/json').status_code == 413
    assert client.get('/api/routes').status_code == 405
    assert 'POST' in client.get('/api/routes').headers['Allow']
    response = client.get('/api/missing')
    assert response.status_code == 404 and response.is_json
    assert client.post('/api/routes', json=dict(sourceId='new-delhi', destinationId='ito', networkVersion='old')).status_code == 409


def test_internal_error_is_controlled(client, app, monkeypatch):
    def fail(*args):
        raise RuntimeError('private implementation detail')
    monkeypatch.setattr(app.extensions['route_service'], 'find', fail)
    response = client.post('/api/routes', json=dict(sourceId='new-delhi', destinationId='ito'))
    assert response.status_code == 500 and response.json['status'] == 'error'
    assert 'private implementation detail' not in response.text


def test_disconnected_network_api(tmp_path):
    raw = deepcopy(DATA)
    raw['transfers'] = []
    path = tmp_path / 'network.json'
    path.write_text(json.dumps(raw), encoding='utf-8')
    client = create_app({'TESTING': True, 'NETWORK_PATH': path}).test_client()
    response = client.post('/api/routes', json=dict(sourceId='pul-bangash', destinationId='rk-ashram'))
    assert response.status_code == 200 and response.json['status'] == 'no-route'


def test_transfer_penalty_changes_optimum():
    raw = deepcopy(DATA)
    next(e for e in raw['transfers'] if e['id'] == 'transfer-rajiv-chowk-yellow-blue')['minutes'] = 100
    route = RouteService(validate_network(raw)).find('new-delhi', 'rk-ashram')['route']
    assert route['totalTravelTime'] == 24
    assert [t['stationId'] for t in route['interchanges']] == ['central-secretariat', 'mandi-house']


def test_all_462_pairs_against_independent_oracle(client):
    # Build the oracle directly from raw records, independently of Graph and Dijkstra.
    states = [(s['id'], line) for s in DATA['stations'] for line in s['lineIds']]
    idx = {state: i for i, state in enumerate(states)}
    n = len(states)
    distance = [[0 if i == j else math.inf for j in range(n)] for i in range(n)]
    for edge in DATA['connections']:
        a, b = idx[(edge['from'], edge['lineId'])], idx[(edge['to'], edge['lineId'])]
        distance[a][b] = distance[b][a] = edge['minutes']
    for edge in DATA['transfers']:
        a, b = idx[(edge['stationId'], edge['fromLineId'])], idx[(edge['stationId'], edge['toLineId'])]
        distance[a][b] = distance[b][a] = edge['minutes']
    for k in range(n):
        for i in range(n):
            for j in range(n):
                distance[i][j] = min(distance[i][j], distance[i][k] + distance[k][j])
    connections = {e['id']: e for e in DATA['connections']}
    count = 0
    for source in DATA['stations']:
        for destination in DATA['stations']:
            if source['id'] == destination['id']:
                continue
            expected = min(distance[idx[(source['id'], a)]][idx[(destination['id'], b)]] for a in source['lineIds'] for b in destination['lineIds'])
            response = client.post('/api/routes', json=dict(sourceId=source['id'], destinationId=destination['id']))
            assert response.status_code == 200
            route = response.json['route']
            assert route['totalTravelTime'] == expected == route['rideMinutes'] + route['transferMinutes']
            assert len(route['stationIds']) == len(route['connectionIds']) + 1
            for i, edge_id in enumerate(route['connectionIds']):
                edge = connections[edge_id]
                assert {edge['from'], edge['to']} == set(route['stationIds'][i:i + 2])
            assert [e for s in route['segments'] for e in s['connectionIds']] == route['connectionIds']
            assert route['interchangeCount'] == len(route['interchanges'])
            count += 1
    assert count == 462


@pytest.mark.parametrize('kind', ['negative', 'nan', 'infinity', 'bool', 'free-transfer', 'missing-edge',
    'unknown-station', 'duplicate-id', 'duplicate-code', 'membership', 'transfer', 'color', 'coordinates', 'duplicate-transfer'])
def test_invalid_networks(kind):
    raw = deepcopy(DATA)
    if kind in ('negative', 'nan', 'infinity', 'bool'):
        raw['connections'][0]['minutes'] = {'negative': -1, 'nan': math.nan, 'infinity': math.inf, 'bool': True}[kind]
    elif kind == 'free-transfer': raw['transfers'][0]['minutes'] = 0
    elif kind == 'missing-edge': raw['connections'].pop()
    elif kind == 'unknown-station': raw['connections'][0]['from'] = 'missing'
    elif kind == 'duplicate-id': raw['stations'][1]['id'] = raw['stations'][0]['id']
    elif kind == 'duplicate-code': raw['stations'][1]['code'] = raw['stations'][0]['code'].lower()
    elif kind == 'membership': raw['stations'][0]['lineIds'].append('blue')
    elif kind == 'transfer': raw['transfers'][0]['stationId'] = 'pul-bangash'
    elif kind == 'color': raw['lines'][0]['color'] = 'red'
    elif kind == 'coordinates': raw['stations'][0]['x'] = math.inf
    elif kind == 'duplicate-transfer': raw['transfers'].append({**raw['transfers'][0], 'id': 'duplicate-transfer'})
    with pytest.raises(ValueError): validate_network(raw)


def test_zero_ride_weight_and_read_only_input():
    raw = deepcopy(DATA)
    raw['connections'][0]['minutes'] = 0
    service = RouteService(validate_network(raw))
    raw['stations'].clear()
    assert len(service.model.stations) == 22
    assert service.find('pul-bangash', 'rk-ashram')['status'] == 'success'


def test_invalid_data_prevents_startup(tmp_path):
    path = tmp_path / 'bad.json'
    path.write_text('{}')
    with pytest.raises(ValueError): create_app({'NETWORK_PATH': path})
    with pytest.raises(FileNotFoundError): create_app({'NETWORK_PATH': tmp_path / 'missing.json'})


def test_heap_decrease_and_ties():
    heap = MinHeap()
    for i in range(100): heap.set(f'k{i:03}', 1000 + i)
    for i in reversed(range(100)): heap.set(f'k{i:03}', i)
    heap.set('k000', 500)
    assert len(heap.entries) == 100
    assert [heap.pop()[0] for _ in range(100)] == list(range(100))
    for key in ['z', 'b', 'a']: heap.set(key, 1)
    assert [heap.pop()[1] for _ in range(3)] == ['a', 'b', 'z']
    with pytest.raises(ValueError): heap.set('bad', math.inf)


def test_static_serving_and_path_safety(tmp_path):
    (tmp_path / 'assets').mkdir()
    (tmp_path / 'index.html').write_text('<html>Metro app</html>')
    (tmp_path / 'assets/app.js').write_text('console.log(1)')
    client = create_app({'TESTING': True, 'FRONTEND_DIST': tmp_path}).test_client()
    assert client.get('/').status_code == 200
    assert client.get('/assets/app.js').status_code == 200
    assert client.get('/assets/../index.html').status_code == 404
    assert client.get('/backend/app.py').status_code == 404
    client = create_app({'FRONTEND_DIST': tmp_path / 'missing'}).test_client()
    assert client.get('/').status_code == 503
