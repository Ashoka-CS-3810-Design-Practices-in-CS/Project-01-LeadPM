# Flask backend

Run commands from the project root. Python 3.13 was used for verification.

```powershell
python -m venv backend/.venv
backend/.venv/Scripts/python.exe -m pip install -r backend/requirements-lock.txt
backend/.venv/Scripts/python.exe -m flask --app backend.app run --host=127.0.0.1 --port=5000
```

For the built app with Waitress:

```powershell
backend/.venv/Scripts/waitress-serve.exe --host=127.0.0.1 --port=5000 --call backend.app:create_app
```

The root page serves `website/dist/index.html`; build it first with `npm run build` inside `website/`. No database or API key is required. The final schema diagram describes JSON entities and references.

| Endpoint | Result |
|---|---|
| GET `/api/health` | Server status, loaded dataset version and station count |
| GET `/api/network` | Complete validated network JSON |
| POST `/api/routes` | JSON route outcome for `sourceId`, `destinationId`, optional `networkVersion` |

Success and no-route outcomes use 200; invalid input/access-unconfirmed endpoints use 400; stale versions 409; malformed JSON 400; wrong content type 415; oversized requests 413; wrong methods 405; missing endpoints 404; unexpected errors 500. The UI sends the version it loaded. API responses use no-store.

`create_app(config)` accepts `NETWORK_PATH` and `FRONTEND_DIST` overrides for tests. Invalid data prevents startup. Shared model/graph objects are treated as read-only; each request owns its heap, distances and predecessor map. Reload data by restarting the server after regeneration.

Run `backend/.venv/Scripts/python.exe -m pytest backend/tests -q` from the root. The suite includes all-pairs routing verification, directed loops, walking links, branches, API errors, static serving and fixture regressions.

`requirements.txt` lists runtime packages, `requirements-dev.txt` adds pytest, and `requirements-lock.txt` records the exact installed dependency set. See [data provenance](data/PROVENANCE.md) for every coverage and time-model qualification.
