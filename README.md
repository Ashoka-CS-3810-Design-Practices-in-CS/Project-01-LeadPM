# Delhi NCR Metro Route Planner

React 19 and TypeScript frontend with a Python 3.13 and Flask 3.1.3 backend. The browser requests network data and route results from the Flask JSON API. Flask validates the versioned read-only JSON network and calculates routes using a station-line adjacency graph, indexed binary min-heap, Dijkstra, and predecessor reconstruction.

**GitHub:** <https://github.com/Ashoka-CS-3810-Design-Practices-in-CS/Project-01-LeadPM>
**Vercel production:** <https://dpcs-delhi-metro.vercel.app>

## Technology stack

- **Frontend:** React 19, TypeScript, Vite 8, SVG, `d3-selection` 3, `d3-zoom` 3, and Zod 4.
- **Backend:** Python 3.13 and Flask 3.1.3 using an application factory. Waitress 3.0.2 serves the local build; Vercel runs the same Flask WSGI app as a Python Function.
- **Data:** Versioned `backend/data/metro-network.json`, checked against the JSON schema and semantic rules at startup. The network is read-only and requires no database.
- **Routing:** Python station-line adjacency graph, indexed binary min-heap, Dijkstra, predecessor reconstruction, and explicit interchange edges. The browser never calculates production routes.
- **Tests:** pytest 8.4.2, Vitest 5, Testing Library, and Playwright against the built site.
- **Build and deploy:** npm lockfile, Python dependency lock, Git/GitHub, Vercel Python Functions, and GitHub Pages retained as a separate static deployment.

## Run locally

From the repository root in PowerShell:

```powershell
python -m venv backend/.venv
backend/.venv/Scripts/python.exe -m pip install -r backend/requirements-lock.txt
cd website
npm ci
npm run build
cd ..
backend/.venv/Scripts/waitress-serve.exe --host=127.0.0.1 --port=5000 --call backend.app:create_app
```

Open <http://127.0.0.1:5000>. For frontend development, keep Flask running and use `npm run dev` from `website/`; Vite on port 5173 proxies `/api` to port 5000.

## API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/health` | API status and loaded network version/count |
| GET | `/api/network` | Validated network JSON |
| POST | `/api/routes` | Calculate the fastest estimated route |

`POST /api/routes` accepts `sourceId`, `destinationId`, and optional `networkVersion`. The frontend validates network and route responses with Zod. Route costs are coursework estimates, not live schedules.

On startup, Flask validates the full network and builds the reusable graph once. Each route request runs Dijkstra with request-local distance, predecessor, and heap state, then returns stable station and connection IDs with the itinerary. React owns all UI and SVG elements; D3 handles only map pan and zoom. A reducer revision prevents late route responses from replacing newer user selections.

## Verify

```powershell
backend/.venv/Scripts/python.exe -m pytest backend/tests -q
cd website
npm test
npm run build
$env:APP_URL='http://127.0.0.1:5000'
npm run test:browser
```

Backend tests compare all selectable station pairs to an independent Floyd–Warshall oracle. Browser checks run against the built website served by Waitress.

## Deploy to Vercel

Vercel builds the React client with `build.py`, copies the result to root `public/`, and runs the Flask app exposed by root `app.py` as a Python Function. The Vercel configuration is in `pyproject.toml` and `vercel.json`.

The existing GitHub Pages deployment at <https://dpcs.ribence.com.np/> remains separate and unchanged. This Flask-backed project is deployed on Vercel.
