#!/usr/bin/env python3
# /// script
# dependencies = ["pyyaml", "watchdog"]
# ///
"""
server.py — local web UI for yamlcv
Usage: uv run server.py
Opens browser at http://localhost:7878
"""

import os
import sys
import json
import shutil
import threading
import subprocess
import http.server
import urllib.parse
from pathlib import Path
import argparse
import webbrowser

ROOT = Path(__file__).parent
TEMPLATES_DIR = ROOT / "templates"
GENERATED_DIR = ROOT / "generated"
UI_DIR = ROOT / "ui"

GENERATED_DIR.mkdir(exist_ok=True)

class Handler(http.server.SimpleHTTPRequestHandler):
    _custom_details = None

    @classmethod
    def details_path(cls, template):
        if cls._custom_details:
            return Path(cls._custom_details)
        return TEMPLATES_DIR / template / "details.yml"

    def log_message(self, format, *args):
        pass

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)

        if parsed.path == "/":
            self.serve_file(UI_DIR / "index.html", "text/html")

        elif parsed.path == "/api/templates":
            templates = [d.name for d in TEMPLATES_DIR.iterdir() if d.is_dir()]
            self.json_response(templates)

        elif parsed.path.startswith("/api/schema"):
            template = urllib.parse.parse_qs(parsed.query).get("template", ["jake"])[0]
            schema_path = TEMPLATES_DIR / template / "schema.yml"
            if schema_path.exists():
                self.serve_file(schema_path, "text/plain")
            else:
                self.send_error(404, "Schema not found")

        elif parsed.path.startswith("/api/details"):
            template = urllib.parse.parse_qs(parsed.query).get("template", ["jake"])[0]
            details_path = Handler.details_path(template)
            if details_path.exists():
                self.serve_file(details_path, "text/plain")
            else:
                self.send_error(404)

        elif parsed.path.startswith("/api/pdf"):
            pdf_path = GENERATED_DIR / "resume.pdf"
            if pdf_path.exists():
                self.serve_file(pdf_path, "application/pdf")
            else:
                self.send_error(404, "No PDF yet")

        elif parsed.path == "/api/status":
            self.json_response({"status": "ok"})

        else:
            self.send_error(404)

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)

        if parsed.path == "/api/save":
            template = urllib.parse.parse_qs(parsed.query).get("template", ["jake"])[0]
            length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(length).decode("utf-8")
            details_path = Handler.details_path(template)
            details_path.parent.mkdir(parents=True, exist_ok=True)
            details_path.write_text(body)
            error, warning = self.run_build(template, str(details_path))
            self.json_response({"ok": not error, "error": error, "warning": warning})

        else:
            self.send_error(404)

    def run_build(self, template, details_path):
        return run_build(template, details_path)

    def serve_file(self, path, content_type):
        try:
            data = Path(path).read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", len(data))
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            self.wfile.write(data)
        except Exception as e:
            self.send_error(500, str(e))

    def json_response(self, data):
        body = json.dumps(data).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", len(body))
        self.end_headers()
        self.wfile.write(body)


def ensure_details_file(details_path):
    path = Path(details_path)
    if path.exists():
        return
    default = path.parent / "details.yml"
    if default.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy(default, path)
        print(f"→ Created {path} from {default}", flush=True)


def run_build(template, details_path):
    old_pdf = GENERATED_DIR / "resume.pdf"
    if old_pdf.exists():
        old_pdf.unlink()

    build_script = TEMPLATES_DIR / template / "build.py"
    cmd = [sys.executable, str(build_script), "--details", details_path]
    result = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
    if result.returncode == 2:
        return None, result.stderr + result.stdout
    elif result.returncode != 0:
        return result.stderr + result.stdout, None
    return None, None


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('--details', default=None, help='Path to custom details yml file')
    parser.add_argument('--port', default=7878, type=int)
    args = parser.parse_args()

    if args.details:
        ensure_details_file(args.details)
    Handler._custom_details = args.details

    details_path = Handler.details_path("jake")
    if details_path.exists():
        print("→ Building initial PDF...", flush=True)
        error, warning = run_build("jake", str(details_path))
        if error:
            print(f"✗ Initial build failed:\n{error}", flush=True)
        else:
            if warning:
                print(warning, flush=True)
            print("✓ Initial PDF ready", flush=True)

    PORT = args.port
    server = http.server.HTTPServer(("0.0.0.0", PORT), Handler)
    print(f"→ yamlcv UI running at http://localhost:{PORT}", flush=True)
    if args.details:
        print(f"→ using details: {args.details}", flush=True)
    print("  Ctrl+C to stop", flush=True)
    if not Path("/.dockerenv").exists():
        threading.Timer(1, lambda: webbrowser.open(f"http://localhost:{PORT}")).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n→ Stopped.")