"""Vercel entrypoint for the Flask application."""
from pathlib import Path

from backend.app import create_app

app = create_app({"FRONTEND_DIST": Path(__file__).resolve().parent / "public"})
