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
import time
import threading
import subprocess
import http.server
import urllib.parse
from pathlib import Path

ROOT = Path(__file__).parent
TEMPLATES_DIR = ROOT / "templates"
GENERATED_DIR = ROOT / "generated"
UI_DIR = ROOT / "ui"

GENERATED_DIR.mkdir(exist_ok=True)

class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass  # suppress request logs

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)

        if parsed.path == "/":
            self.serve_file(UI_DIR / "index.html", "text/html")

        elif parsed.path == "/api/templates":
            templates = [d.name for d in TEMPLATES_DIR.iterdir() if d.is_dir()]
            self.json_response(templates)

        elif parsed.path.startswith("/api/details"):
            template = urllib.parse.parse_qs(parsed.query).get("template", ["jake"])[0]
            details_path = TEMPLATES_DIR / template / "details.yml"
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
            details_path = TEMPLATES_DIR / template / "details.yml"
            details_path.write_text(body)
            # trigger build
            threading.Thread(target=self.run_build, args=(template,), daemon=True).start()
            self.json_response({"ok": True})

        else:
            self.send_error(404)

    def run_build(self, template):
        build_script = TEMPLATES_DIR / template / "build.py"
        subprocess.run(
            [sys.executable, str(build_script)],
            cwd=ROOT,
            capture_output=True
        )

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


if __name__ == "__main__":
    import webbrowser
    PORT = 7878
    server = http.server.HTTPServer(("localhost", PORT), Handler)
    print(f"→ yamlcv UI running at http://localhost:{PORT}")
    print("  Ctrl+C to stop")
    threading.Timer(1, lambda: webbrowser.open(f"http://localhost:{PORT}")).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n→ Stopped.")