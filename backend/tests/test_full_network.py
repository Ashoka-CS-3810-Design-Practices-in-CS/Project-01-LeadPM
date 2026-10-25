import json
import math

from backend.app import ROOT, create_app
from backend.network import validate_network
from backend.routing import RouteService

DATA = json.loads((ROOT / 'backend/data/metro-network.json').read_text(encoding='utf-8'))
SERVICE = RouteService(validate_network(DATA))


def test_all_line_counts_and_extensions():
    expected = {'red':29,'yellow':37,'blue':57,'green':24,'violet':34,'pink':46,'magenta':33,'grey':4,'airport':7,'rapid':11,'aqua':21}
    assert {line['id']:len(line['stationIds']) for line in DATA['lines']} == expected
    assert len(DATA['stations']) == 276
    assert {'deepali-chowk','bhalswa-lake','burari','yamuna-vihar','krishna-park-extension',
            'yashobhoomi-dwarka-sector-25','dhansa-bus-stand','depot-station','sector-55-56'} <= SERVICE.model.stations.keys()


def test_all_operational_pairs_against_independent_floyd_warshall():
    states = [(s['id'],line) for s in DATA['stations'] for line in s['lineIds']]
    index = {state:i for i,state in enumerate(states)}
    n = len(states)
    distances = [[0 if a==b else math.inf for b in range(n)] for a in range(n)]
    for edge in DATA['connections']:
        a,b = index[(edge['from'],edge['lineId'])],index[(edge['to'],edge['lineId'])]
        distances[a][b] = edge['minutes']
        if edge.get('bidirectional',True): distances[b][a] = edge['minutes']
    for edge in DATA['transfers']:
        a,b = index[(edge['stationId'],edge['fromLineId'])],index[(edge.get('toStationId',edge['stationId']),edge['toLineId'])]
        distances[a][b] = distances[b][a] = edge['minutes']
    for k in range(n):
        for i in range(n):
            if math.isinf(distances[i][k]): continue
            for j in range(n):
                candidate = distances[i][k] + distances[k][j]
                if candidate < distances[i][j]: distances[i][j] = candidate
    count=0
    for source in DATA['stations']:
        for destination in DATA['stations']:
            if source['id']==destination['id'] or 'access-unconfirmed' in (source['status'],destination['status']): continue
            expected=min(distances[index[(source['id'],a)]][index[(destination['id'],b)]] for a in source['lineIds'] for b in destination['lineIds'])
            assert math.isfinite(expected)
            outcome=SERVICE.find(source['id'],destination['id'])
            assert outcome['status']=='success'
            route=outcome['route']
            assert route['totalTravelTime']==expected==route['rideMinutes']+route['transferMinutes']
            assert route['stationIds'][0]==source['id'] and route['stationIds'][-1]==destination['id']
            walks=sum('toStationId' in t for t in route['interchanges'])
            assert len(route['stationIds'])==len(route['connectionIds'])+walks+1
            count+=1
    assert count==75350


def test_walking_links_in_both_directions():
    for edge in DATA['transfers']:
        if 'toStationId' not in edge: continue
        for a,b in [(edge['stationId'],edge['toStationId']),(edge['toStationId'],edge['stationId'])]:
            route=SERVICE.find(a,b)['route']
            assert route['stationIds']==[a,b]
            assert route['connectionIds']==[]
            assert route['interchanges'][0]['toStationId']==b
            assert route['totalTravelTime']==edge['minutes']


def test_branches_ring_and_disjoint_magenta_sections():
    assert SERVICE.find('vaishali','noida-electronic-city')['route']['interchangeCount']==0
    assert SERVICE.find('kirti-nagar','inderlok')['route']['interchangeCount']==0
    assert SERVICE.find('majlis-park','yamuna-vihar')['route']['interchangeCount']==0
    assert SERVICE.find('krishna-park-extension','deepali-chowk')['route']['interchangeCount']>0
    # A one-way Rapid Metro loop must not create an impossible reverse shortcut.
    assert SERVICE.find('cyber-city','belvedere-towers')['route']['stationIds']==[
        'cyber-city','moulsari-avenue','phase-3','phase-2','belvedere-towers']


def test_access_unconfirmed_and_real_api():
    client=create_app({'TESTING':True}).test_client()
    assert client.get('/api/health').json['stations']==276
    assert client.get('/api/network').json==DATA
    response=client.post('/api/routes',json=dict(sourceId='soorghat',destinationId='new-delhi'))
    assert response.status_code==400 and 'access' in response.json['message']
    for source,destination in [('depot-station','sector-55-56'),('rithala','raja-nahar-singh-ballabhgarh'),('dhansa-bus-stand','yashobhoomi-dwarka-sector-25')]:
        response=client.post('/api/routes',json=dict(sourceId=source,destinationId=destination))
        assert response.status_code==200 and response.json['status']=='success'
