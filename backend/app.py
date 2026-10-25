"""HTTP boundary and application factory. Run from the workspace root."""
import json
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory
from werkzeug.exceptions import HTTPException

from .network import validate_network
from .routing import RouteService

ROOT = Path(__file__).resolve().parents[1]


def create_app(config=None):
    app = Flask(__name__, static_folder=None)
    app.config.from_mapping(
        NETWORK_PATH=ROOT / "backend/data/metro-network.json",
        FRONTEND_DIST=ROOT / "website/dist",
        MAX_CONTENT_LENGTH=4096,
    )
    if config:
        app.config.update(config)
    # Invalid/missing data prevents startup; no partial network is served.
    raw = json.loads(Path(app.config["NETWORK_PATH"]).read_text(encoding="utf-8"))
    model = validate_network(raw)
    service = RouteService(model)
    app.extensions["route_service"] = service

    @app.get("/api/health")
    def health():
        return jsonify(status="ok", networkVersion=model.data["version"], stations=len(model.stations))

    @app.get("/api/network")
    def network():
        return jsonify(model.data)

    @app.post("/api/routes")
    def routes():
        body = request.get_json()
        if not isinstance(body, dict) or set(body) - {"sourceId", "destinationId", "networkVersion"}:
            return jsonify(status="error", message="Expected a JSON object containing station IDs and optional networkVersion."), 400
        if "networkVersion" in body and body["networkVersion"] != model.data["version"]:
            return jsonify(status="error", message="The metro network changed. Reload the page and try again."), 409
        outcome = service.find(body.get("sourceId"), body.get("destinationId"))
        return jsonify(outcome), 400 if outcome["status"] == "error" else 200

    @app.errorhandler(HTTPException)
    def http_error(error):
        response = error.get_response()
        response.data = app.json.dumps(dict(status="error", message=error.description))
        response.content_type = "application/json"
        return response

    @app.errorhandler(Exception)
    def unexpected_error(error):
        app.logger.exception("Request failed")
        return jsonify(status="error", message="This request could not be completed. Please try again."), 500

    @app.after_request
    def headers(response):
        if request.path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store"
        response.headers["X-Content-Type-Options"] = "nosniff"
        return response

    @app.get("/")
    def index():
        dist = Path(app.config["FRONTEND_DIST"])
        if not (dist / "index.html").is_file():
            return jsonify(status="error", message="Build the frontend first: cd website && npm run build"), 503
        return send_from_directory(dist, "index.html")

    @app.get("/assets/<path:filename>")
    def assets(filename):
        return send_from_directory(Path(app.config["FRONTEND_DIST"]) / "assets", filename)

    return app
