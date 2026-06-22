#!/usr/bin/env python3
# /// script
# dependencies = ["pyyaml", "watchdog"]
# ///
"""
server.py — local web UI for ResumeKit
Usage: uv run server.py
Opens browser at http://localhost:7878
"""

import re
import sys
import json
import yaml
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
PROFILES_FILE = GENERATED_DIR / "profiles.json"

GENERATED_DIR.mkdir(exist_ok=True)

DEFAULT_TEMPLATE = "classic"

STATIC_TYPES = {
    ".css": "text/css",
    ".js": "application/javascript",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
}


def is_unseeded_details_stub(path):
    """True when YAML looks like an empty UI save, not a seeded resume."""
    try:
        data = yaml.safe_load(path.read_text()) or {}
    except yaml.YAMLError:
        return False
    if not isinstance(data, dict):
        return True
    heading = data.get("heading") or {}
    if heading.get("name"):
        return False
    if data.get("experience") or data.get("projects") or data.get("education"):
        return False
    # options-only shell from collectFormData() on an empty form
    return bool(data.get("options"))


def ensure_details_file(details_path):
    path = Path(details_path)
    default = path.parent / "details.yml"
    if not default.exists():
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and not is_unseeded_details_stub(path):
        return
    if path.exists():
        print(f"→ Replacing unseeded stub {path} from {default}", flush=True)
    else:
        print(f"→ Created {path} from {default}", flush=True)
    shutil.copy(default, path)


def get_page_count():
    log_file = GENERATED_DIR / "resume.log"
    if not log_file.exists():
        return None
    content = log_file.read_text(errors="ignore")
    match = re.search(r"Output written on.*?\((\d+) page", content)
    return int(match.group(1)) if match else None


def run_build(template, details_path):
    old_pdf = GENERATED_DIR / "resume.pdf"
    if old_pdf.exists():
        old_pdf.unlink()

    build_script = TEMPLATES_DIR / template / "build.py"
    cmd = [sys.executable, str(build_script), "--details", details_path]
    result = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
    pages = get_page_count()

    if result.returncode == 2:
        warning = result.stderr + result.stdout
        return None, warning, pages
    if result.returncode != 0:
        return result.stderr + result.stdout, None, pages
    return None, None, pages


def template_from_query(query):
    return urllib.parse.parse_qs(query).get("template", [DEFAULT_TEMPLATE])[0]


def profile_from_query(query):
    return urllib.parse.parse_qs(query).get("profile", ["personal"])[0]


def load_profiles():
    if PROFILES_FILE.is_file():
        try:
            data = json.loads(PROFILES_FILE.read_text())
            if isinstance(data, list) and data:
                return data
        except json.JSONDecodeError:
            pass
    return default_profiles()


def default_profiles():
    return [
        {
            "id": "personal",
            "name": "Personal",
            "path": "templates/classic/details.personal.yml",
        }
    ]


def save_profiles(profiles):
    GENERATED_DIR.mkdir(exist_ok=True)
    PROFILES_FILE.write_text(json.dumps(profiles, indent=2) + "\n")


def ensure_profiles_file():
    if PROFILES_FILE.is_file():
        try:
            data = json.loads(PROFILES_FILE.read_text())
            if isinstance(data, list) and data:
                return data
        except json.JSONDecodeError:
            pass
    profiles = default_profiles()
    save_profiles(profiles)
    return profiles


def resolve_profile_path(profile_entry):
    raw = profile_entry["path"]
    path = Path(raw)
    if not path.is_absolute():
        path = ROOT / path
    return path.resolve()


def find_profile(profile_id):
    for entry in load_profiles():
        if entry["id"] == profile_id:
            return entry
    return None


def profile_slug(name):
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-") or "profile"


def unique_profile_id(slug, profiles, exclude_id=None):
    existing = {p["id"] for p in profiles if p["id"] != exclude_id}
    if slug not in existing:
        return slug
    n = 2
    while f"{slug}-{n}" in existing:
        n += 1
    return f"{slug}-{n}"


def path_relative_to_root(path):
    resolved = Path(path).resolve()
    try:
        return str(resolved.relative_to(ROOT.resolve())).replace("\\", "/")
    except ValueError:
        return str(resolved)


def clear_generated_dir():
    if not GENERATED_DIR.exists():
        GENERATED_DIR.mkdir(exist_ok=True)
        return
    for entry in GENERATED_DIR.iterdir():
        if entry.is_file():
            entry.unlink()
        elif entry.is_dir():
            shutil.rmtree(entry)


def remove_profile_yamls():
    if not TEMPLATES_DIR.exists():
        return
    for template_dir in TEMPLATES_DIR.iterdir():
        if not template_dir.is_dir():
            continue
        for yml in template_dir.glob("details.*.yml"):
            yml.unlink(missing_ok=True)


def reset_workspace(template=DEFAULT_TEMPLATE):
    clear_generated_dir()
    remove_profile_yamls()
    if PROFILES_FILE.is_file():
        PROFILES_FILE.unlink()
    profiles = ensure_profiles_file()
    for entry in profiles:
        ensure_details_file(resolve_profile_path(entry))
    details_path = resolve_profile_path(profiles[0])
    error, warning, pages = run_build(template, str(details_path))
    return {
        "ok": not error,
        "error": error,
        "warning": warning,
        "pages": pages,
        "profiles": profiles,
    }


class Handler(http.server.SimpleHTTPRequestHandler):
    @classmethod
    def require_details_path(cls, template, profile_id=None):
        profile_id = profile_id or "personal"
        entry = find_profile(profile_id)
        if not entry:
            return None
        return resolve_profile_path(entry)

    def log_message(self, format, *args):
        pass

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        routes = {
            "/": self._get_index,
            "/api/templates": self._get_templates,
            "/api/profiles": self._get_profiles,
            "/api/status": self._get_status,
            "/api/build-info": self._get_build_info,
        }
        if parsed.path in routes:
            routes[parsed.path]()
        elif parsed.path.startswith("/api/schema"):
            self._get_schema(parsed.query)
        elif parsed.path.startswith("/api/details"):
            self._get_details(parsed.query)
        elif parsed.path.startswith("/api/pdf"):
            self._get_pdf()
        elif parsed.path.startswith("/api/tex"):
            self._get_tex()
        elif parsed.path.startswith("/"):
            self._get_static(parsed.path)
        else:
            self.send_error(404)

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/save":
            self._post_save(parsed.query)
        elif parsed.path == "/api/build":
            self._post_build(parsed.query)
        elif parsed.path == "/api/profiles":
            self._post_profiles()
        elif parsed.path == "/api/reset":
            self._post_reset(parsed.query)
        else:
            self.send_error(404)

    def do_PUT(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/profiles":
            self._put_profile(parsed.query)
        else:
            self.send_error(404)

    def do_DELETE(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/profiles":
            self._delete_profile(parsed.query)
        else:
            self.send_error(404)

    def _get_index(self):
        self.serve_file(UI_DIR / "index.html", "text/html")

    def _get_templates(self):
        templates = sorted(
            d.name
            for d in TEMPLATES_DIR.iterdir()
            if d.is_dir() and (d / "build.py").is_file() and (d / "schema.yml").is_file()
        )
        self.json_response(templates)

    def _get_profiles(self):
        profiles = []
        for entry in load_profiles():
            path = resolve_profile_path(entry)
            profiles.append({
                "id": entry["id"],
                "name": entry["name"],
                "path": str(path.relative_to(ROOT)) if path.is_relative_to(ROOT) else str(path),
                "exists": path.exists(),
            })
        self.json_response(profiles)

    def _post_profiles(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length).decode("utf-8"))
        except (json.JSONDecodeError, ValueError) as e:
            self.json_error(400, str(e))
            return

        name = (body.get("name") or "").strip()
        path_str = (body.get("path") or "").strip()
        if not name or not path_str:
            self.json_error(400, "name and path required")
            return

        profiles = load_profiles()
        slug = profile_slug(name)
        profile_id = unique_profile_id(slug, profiles)

        path = Path(path_str)
        if not path.is_absolute():
            path = ROOT / path
        try:
            ensure_details_file(path)
            path_str = path_relative_to_root(path)
            profiles.append({"id": profile_id, "name": name, "path": path_str})
            save_profiles(profiles)
        except OSError as e:
            self.json_error(500, f"Could not save profile: {e}")
            return

        self.json_response({"id": profile_id, "name": name, "path": path_str})

    def _put_profile(self, query):
        profile_id = profile_from_query(query)
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length).decode("utf-8"))
        except (json.JSONDecodeError, ValueError) as e:
            self.json_error(400, str(e))
            return

        name = (body.get("name") or "").strip()
        if not name:
            self.json_error(400, "name required")
            return

        profiles = load_profiles()
        for i, entry in enumerate(profiles):
            if entry["id"] != profile_id:
                continue

            slug = profile_slug(name)
            new_id = unique_profile_id(slug, profiles, exclude_id=profile_id)
            old_path = resolve_profile_path(entry)
            new_path = old_path.parent / f"details.{new_id}.yml"
            new_path_str = path_relative_to_root(new_path)

            if old_path.resolve() != new_path.resolve():
                if new_path.exists():
                    self.json_error(409, f"YAML already exists: {new_path_str}")
                    return
                new_path.parent.mkdir(parents=True, exist_ok=True)
                if old_path.exists():
                    shutil.move(str(old_path), str(new_path))
                else:
                    ensure_details_file(new_path)
                entry["path"] = new_path_str

            entry["name"] = name
            entry["id"] = new_id
            profiles[i] = entry
            try:
                save_profiles(profiles)
            except OSError as e:
                self.json_error(500, f"Could not save profile: {e}")
                return
            self.json_response({
                "id": new_id,
                "name": name,
                "path": entry["path"],
            })
            return

        self.json_error(404, "profile not found")

    def _delete_profile(self, query):
        profile_id = profile_from_query(query)
        profiles = load_profiles()
        if len(profiles) <= 1:
            self.json_error(400, "cannot delete the only profile")
            return
        if not find_profile(profile_id):
            self.json_error(404, "profile not found")
            return
        profiles = [p for p in profiles if p["id"] != profile_id]
        try:
            save_profiles(profiles)
        except OSError as e:
            self.json_error(500, f"Could not save profiles: {e}")
            return
        self.json_response({"ok": True, "deleted": profile_id})

    def _post_reset(self, query):
        template = template_from_query(query)
        try:
            result = reset_workspace(template)
            self.json_response(result)
        except OSError as e:
            self.json_error(500, f"Reset failed: {e}")

    def _get_status(self):
        self.json_response({"status": "ok"})

    def _get_build_info(self):
        self.json_response({"pages": get_page_count()})

    def _get_schema(self, query):
        template = template_from_query(query)
        schema_path = TEMPLATES_DIR / template / "schema.yml"
        if schema_path.exists():
            self.serve_file(schema_path, "text/plain")
        else:
            self.send_error(404, "Schema not found")

    def _get_details(self, query):
        template = template_from_query(query)
        profile_id = profile_from_query(query)
        details_path = self.require_details_path(template, profile_id)
        if not details_path:
            self.send_error(404, "Profile not found")
            return
        ensure_details_file(details_path)
        if details_path.exists():
            self.serve_file(details_path, "text/plain")
        else:
            self.send_error(404)

    def _get_pdf(self):
        pdf_path = GENERATED_DIR / "resume.pdf"
        if pdf_path.exists():
            self.serve_file(pdf_path, "application/pdf")
        else:
            self.send_error(404, "No PDF yet")

    def _get_tex(self):
        tex_path = GENERATED_DIR / "resume.tex"
        if tex_path.exists():
            self.serve_file(tex_path, "text/plain")
        else:
            self.send_error(404, "No TeX yet")

    def _get_static(self, path):
        static_path = (UI_DIR / path.lstrip("/")).resolve()
        if static_path.is_file() and static_path.is_relative_to(UI_DIR.resolve()):
            content_type = STATIC_TYPES.get(static_path.suffix, "application/octet-stream")
            self.serve_file(static_path, content_type)
        else:
            self.send_error(404)

    def _post_save(self, query):
        template = template_from_query(query)
        profile_id = profile_from_query(query)
        details_path = self.require_details_path(template, profile_id)
        if not details_path:
            self.json_error(404, "profile not found")
            return
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(length).decode("utf-8")
        except (ValueError, UnicodeDecodeError) as e:
            self.json_error(400, str(e))
            return
        try:
            details_path.parent.mkdir(parents=True, exist_ok=True)
            details_path.write_text(body)
        except OSError as e:
            self.json_error(500, str(e))
            return
        self._respond_build(template, profile_id, details_path)

    def _post_build(self, query):
        template = template_from_query(query)
        profile_id = profile_from_query(query)
        details_path = self.require_details_path(template, profile_id)
        if not details_path:
            self.json_error(404, "profile not found")
            return
        ensure_details_file(details_path)
        if not details_path.exists():
            self.json_response({
                "ok": False,
                "error": f"No YAML found for profile: {details_path.name}",
                "warning": None,
                "pages": None,
            })
            return
        self._respond_build(template, profile_id, details_path)

    def _respond_build(self, template, profile_id, details_path):
        error, warning, pages = run_build(template, str(details_path))
        self.json_response({
            "ok": not error,
            "error": error,
            "warning": warning,
            "pages": pages,
        })

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

    def json_response(self, data, status=200):
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", len(body))
        self.end_headers()
        self.wfile.write(body)

    def json_error(self, status, message):
        self.json_response({"ok": False, "error": message}, status=status)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--details", default=None, help="Path to custom details yml file")
    parser.add_argument("--port", default=7878, type=int)
    args = parser.parse_args()

    profiles = ensure_profiles_file()
    for entry in profiles:
        ensure_details_file(resolve_profile_path(entry))

    if args.details:
        ensure_details_file(args.details)
        rel = Path(args.details)
        try:
            rel = Path(args.details).resolve().relative_to(ROOT.resolve())
        except ValueError:
            rel = Path(args.details)
        rel_str = str(rel).replace("\\", "/")
        updated = False
        for entry in profiles:
            if entry["id"] == "personal":
                entry["path"] = rel_str
                updated = True
                break
        if not updated:
            profiles.insert(0, {"id": "personal", "name": "Personal", "path": rel_str})
        save_profiles(profiles)

    details_path = Handler.require_details_path(DEFAULT_TEMPLATE, "personal")
    ensure_details_file(details_path)
    if details_path.exists():
        print("→ Building initial PDF...", flush=True)
        error, warning, _pages = run_build(DEFAULT_TEMPLATE, str(details_path))
        if error:
            print(f"✗ Initial build failed:\n{error}", flush=True)
        else:
            if warning:
                print(warning, flush=True)
            print("✓ Initial PDF ready", flush=True)

    port = args.port
    server = http.server.HTTPServer(("0.0.0.0", port), Handler)
    print(f"→ ResumeKit UI running at http://localhost:{port}", flush=True)
    if args.details:
        print(f"→ using details: {args.details}", flush=True)
    print("  Ctrl+C to stop", flush=True)
    if not Path("/.dockerenv").exists():
        threading.Timer(1, lambda: webbrowser.open(f"http://localhost:{port}")).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n→ Stopped.")


if __name__ == "__main__":
    main()
