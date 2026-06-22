import importlib.util
import json
import shutil
import sys
import threading
import time
import urllib.error
import urllib.request
from http.server import HTTPServer
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

SERVER_MODULE_PATH = ROOT / "server.py"


def load_server_module():
    spec = importlib.util.spec_from_file_location("resumekit_server", SERVER_MODULE_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.fixture(scope="module")
def server_mod():
    return load_server_module()


@pytest.fixture
def tmp_workspace(tmp_path, server_mod):
    """Isolated workspace with copied template + UI."""
    workspace = tmp_path / "workspace"
    shutil.copytree(ROOT / "templates", workspace / "templates")
    shutil.copytree(ROOT / "ui", workspace / "ui")
    workspace.mkdir(exist_ok=True)
    (workspace / "generated").mkdir()

    profiles = [
        {
            "id": "personal",
            "name": "Personal",
            "path": "templates/classic/details.personal.yml",
        }
    ]
    (workspace / "generated" / "profiles.json").write_text(json.dumps(profiles, indent=2))

    details_src = ROOT / "templates" / "classic" / "details.yml"
    personal = workspace / "templates" / "classic" / "details.personal.yml"
    shutil.copy(details_src, personal)

    server_mod.ROOT = workspace
    server_mod.TEMPLATES_DIR = workspace / "templates"
    server_mod.GENERATED_DIR = workspace / "generated"
    server_mod.UI_DIR = workspace / "ui"
    server_mod.PROFILES_FILE = workspace / "generated" / "profiles.json"

    yield workspace, server_mod

    server_mod.ROOT = ROOT
    server_mod.TEMPLATES_DIR = ROOT / "templates"
    server_mod.GENERATED_DIR = ROOT / "generated"
    server_mod.UI_DIR = ROOT / "ui"
    server_mod.PROFILES_FILE = ROOT / "generated" / "profiles.json"


@pytest.fixture
def http_server(tmp_workspace):
    workspace, server_mod = tmp_workspace
    httpd = HTTPServer(("127.0.0.1", 0), server_mod.Handler)
    port = httpd.server_address[1]
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    base = f"http://127.0.0.1:{port}"
    time.sleep(0.05)
    yield base, workspace, server_mod
    httpd.shutdown()
    thread.join(timeout=2)


def http_get(url):
    with urllib.request.urlopen(url) as resp:
        return resp.status, resp.read(), resp.headers.get_content_type()


def http_post(url, body=None, content_type="application/json"):
    data = None if body is None else (
        body.encode() if isinstance(body, str) else body
    )
    req = urllib.request.Request(url, data=data, method="POST")
    if content_type:
        req.add_header("Content-Type", content_type)
    with urllib.request.urlopen(req) as resp:
        return resp.status, resp.read(), resp.headers.get_content_type()


class TestHelpers:
    def test_load_profiles_default(self, server_mod, tmp_path, monkeypatch):
        generated = tmp_path / "generated"
        generated.mkdir()
        missing = generated / "profiles.json"
        monkeypatch.setattr(server_mod, "GENERATED_DIR", generated)
        monkeypatch.setattr(server_mod, "PROFILES_FILE", missing)
        profiles = server_mod.load_profiles()
        assert profiles[0]["id"] == "personal"

    def test_load_profiles_from_file(self, server_mod, tmp_workspace):
        _, mod = tmp_workspace
        profiles = mod.load_profiles()
        assert len(profiles) == 1
        assert profiles[0]["name"] == "Personal"

    def test_find_profile(self, server_mod, tmp_workspace):
        _, mod = tmp_workspace
        assert mod.find_profile("personal")["name"] == "Personal"
        assert mod.find_profile("missing") is None

    def test_get_page_count(self, server_mod, tmp_workspace):
        _, mod = tmp_workspace
        log = mod.GENERATED_DIR / "resume.log"
        log.write_text("Output written on generated/resume.pdf (2 pages).\n")
        assert mod.get_page_count() == 2

    def test_get_page_count_missing(self, server_mod, tmp_workspace):
        _, mod = tmp_workspace
        log = mod.GENERATED_DIR / "resume.log"
        if log.exists():
            log.unlink()
        assert mod.get_page_count() is None

    def test_ensure_profiles_file(self, server_mod, tmp_path, monkeypatch):
        generated = tmp_path / "generated"
        generated.mkdir()
        profiles_path = generated / "profiles.json"
        monkeypatch.setattr(server_mod, "GENERATED_DIR", generated)
        monkeypatch.setattr(server_mod, "PROFILES_FILE", profiles_path)
        profiles = server_mod.ensure_profiles_file()
        assert profiles[0]["id"] == "personal"
        assert profiles_path.exists()

    def test_ensure_details_file(self, server_mod, tmp_workspace):
        workspace, mod = tmp_workspace
        target = workspace / "templates" / "classic" / "details.test.yml"
        if target.exists():
            target.unlink()
        mod.ensure_details_file(target)
        assert target.exists()

    def test_ensure_details_file_replaces_unseeded_stub(self, server_mod, tmp_workspace):
        workspace, mod = tmp_workspace
        stub = workspace / "templates" / "classic" / "details.stub.yml"
        stub.write_text(
            "options:\n  icons: true\nheading: {}\nexperience: []\n",
            encoding="utf-8",
        )
        mod.ensure_details_file(stub)
        text = stub.read_text(encoding="utf-8")
        assert "Taylor Morgan" in text
        assert "Acme Corp" in text

    def test_get_details_seeds_missing_file(self, http_server):
        base, workspace, _ = http_server
        personal = workspace / "templates" / "classic" / "details.personal.yml"
        personal.unlink(missing_ok=True)
        status, body, _ = http_get(f"{base}/api/details?template=classic&profile=personal")
        assert status == 200
        assert b"Taylor Morgan" in body
        assert personal.exists()

    def test_reset_workspace(self, server_mod, tmp_workspace):
        workspace, mod = tmp_workspace
        extra = workspace / "templates" / "classic" / "details.extra.yml"
        extra.write_text("heading:\n  name: Extra\n")
        stub = workspace / "generated" / "resume.tex"
        stub.write_text("% stub")

        result = mod.reset_workspace("classic")

        assert result["ok"] is True
        assert len(result["profiles"]) == 1
        assert result["profiles"][0]["id"] == "personal"
        assert not extra.exists()
        assert (workspace / "templates" / "classic" / "details.personal.yml").exists()
        assert (workspace / "generated" / "profiles.json").exists()
        assert stub.exists()
        assert not stub.read_text().startswith("% stub")


class TestHttpApi:
    def test_index(self, http_server):
        base, _, _ = http_server
        status, body, ctype = http_get(f"{base}/")
        assert status == 200
        assert b"ResumeKit" in body
        assert b'id="app-root" hidden' in body
        assert b'id="boot-overlay"' in body
        assert b"spectacle.css" in body
        assert "text/html" in ctype

    def test_status(self, http_server):
        base, _, _ = http_server
        status, body, _ = http_get(f"{base}/api/status")
        assert status == 200
        assert json.loads(body)["status"] == "ok"

    def test_templates(self, http_server):
        base, _, _ = http_server
        status, body, _ = http_get(f"{base}/api/templates")
        assert status == 200
        templates = json.loads(body)
        assert templates == ["classic"]

    def test_profiles(self, http_server):
        base, _, _ = http_server
        status, body, _ = http_get(f"{base}/api/profiles")
        assert status == 200
        profiles = json.loads(body)
        assert profiles[0]["id"] == "personal"
        assert profiles[0]["exists"] is True

    def test_schema(self, http_server):
        base, _, _ = http_server
        status, body, _ = http_get(f"{base}/api/schema?template=classic")
        assert status == 200
        assert b"sections:" in body

    def test_details(self, http_server):
        base, _, _ = http_server
        status, body, _ = http_get(f"{base}/api/details?template=classic&profile=personal")
        assert status == 200
        assert b"heading:" in body or b"name:" in body

    def test_build_info(self, http_server):
        base, workspace, mod = http_server
        log = workspace / "generated" / "resume.log"
        log.write_text("Output written on generated/resume.pdf (1 page).\n")
        status, body, _ = http_get(f"{base}/api/build-info")
        assert status == 200
        assert json.loads(body)["pages"] == 1

    def test_details_unknown_profile(self, http_server):
        base, _, _ = http_server
        with pytest.raises(urllib.error.HTTPError) as exc:
            http_get(f"{base}/api/details?template=classic&profile=nonexistent")
        assert exc.value.code == 404

    def test_static_css(self, http_server):
        base, _, _ = http_server
        status, body, ctype = http_get(f"{base}/styles.css")
        assert status == 200
        assert "text/css" in ctype
        assert b"--bg" in body
        assert b"#app-root" in body

    def test_static_spectacle_css(self, http_server):
        base, _, _ = http_server
        status, body, ctype = http_get(f"{base}/spectacle.css")
        assert status == 200
        assert "text/css" in ctype
        assert b".spectacle-boot" in body

    def test_static_js_module(self, http_server):
        base, _, _ = http_server
        status, body, _ = http_get(f"{base}/js/app.js")
        assert status == 200
        assert b"init()" in body
        assert b"initSpectacle" in body

    def test_static_spectacle_js(self, http_server):
        base, _, _ = http_server
        status, body, _ = http_get(f"{base}/js/spectacle.js")
        assert status == 200
        assert b"signalAppReady" in body
        assert b"playBuildSpectacle" in body

    def test_static_reset_js(self, http_server):
        base, _, _ = http_server
        status, body, _ = http_get(f"{base}/js/reset.js")
        assert status == 200
        assert b"initReset" in body

    def test_static_tutorial_js(self, http_server):
        base, _, _ = http_server
        status, body, _ = http_get(f"{base}/js/tutorial.js")
        assert status == 200
        assert b"TUTORIAL_STEPS" in body

    def test_post_profile(self, http_server):
        base, workspace, _ = http_server
        payload = json.dumps({
            "name": "Backend SWE",
            "path": "templates/classic/details.backend.yml",
        })
        status, body, _ = http_post(f"{base}/api/profiles", payload)
        assert status == 200
        created = json.loads(body)
        assert created["id"] == "backend-swe"
        assert (workspace / "templates" / "classic" / "details.backend.yml").exists()

    def test_put_profile_rename(self, http_server):
        base, workspace, _ = http_server
        old_yaml = workspace / "templates" / "classic" / "details.personal.yml"
        assert old_yaml.exists()
        payload = json.dumps({"name": "My Resume"})
        req = urllib.request.Request(
            f"{base}/api/profiles?profile=personal",
            data=payload.encode(),
            method="PUT",
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req) as resp:
            assert resp.status == 200
            updated = json.loads(resp.read())
        assert updated["name"] == "My Resume"
        assert updated["id"] == "my-resume"
        assert updated["path"] == "templates/classic/details.my-resume.yml"
        new_yaml = workspace / "templates" / "classic" / "details.my-resume.yml"
        assert new_yaml.exists()
        assert not old_yaml.exists()
        profiles = json.loads((workspace / "generated" / "profiles.json").read_text())
        assert profiles[0]["name"] == "My Resume"
        assert profiles[0]["id"] == "my-resume"

    def test_post_build(self, http_server):
        base, workspace, _ = http_server
        status, body, _ = http_post(f"{base}/api/build?template=classic&profile=personal")
        assert status == 200
        resp = json.loads(body)
        assert "ok" in resp
        if resp["ok"]:
            assert (workspace / "generated" / "resume.tex").exists()

    def test_delete_profile(self, http_server):
        base, workspace, _ = http_server
        payload = json.dumps({
            "name": "Temp",
            "path": "templates/classic/details.temp.yml",
        })
        http_post(f"{base}/api/profiles", payload)
        req = urllib.request.Request(
            f"{base}/api/profiles?profile=temp",
            method="DELETE",
        )
        with urllib.request.urlopen(req) as resp:
            assert resp.status == 200
        profiles = json.loads((workspace / "generated" / "profiles.json").read_text())
        assert all(p["id"] != "temp" for p in profiles)

    def test_post_reset(self, http_server):
        base, workspace, _ = http_server
        payload = json.dumps({
            "name": "Extra",
            "path": "templates/classic/details.extra.yml",
        })
        http_post(f"{base}/api/profiles", payload)
        extra_yaml = workspace / "templates" / "classic" / "details.extra.yml"
        assert extra_yaml.exists()
        (workspace / "generated" / "resume.tex").write_text("% stub")

        status, body, _ = http_post(f"{base}/api/reset?template=classic")
        assert status == 200
        resp = json.loads(body)
        assert resp["ok"] is True
        assert len(resp["profiles"]) == 1
        assert resp["profiles"][0]["id"] == "personal"
        assert not extra_yaml.exists()
        assert (workspace / "templates" / "classic" / "details.personal.yml").exists()
        profiles = json.loads((workspace / "generated" / "profiles.json").read_text())
        assert len(profiles) == 1
        assert profiles[0]["id"] == "personal"

    def test_save_and_tex(self, http_server):
        base, workspace, mod = http_server
        details_path = workspace / "templates" / "classic" / "details.personal.yml"
        yaml_body = details_path.read_text()

        status, body, _ = http_post(
            f"{base}/api/save?template=classic&profile=personal",
            yaml_body,
            content_type="text/plain",
        )
        assert status == 200
        resp = json.loads(body)
        assert "ok" in resp
        assert "pages" in resp

        if resp["ok"]:
            tex = workspace / "generated" / "resume.tex"
            assert tex.exists()
            status, tex_body, _ = http_get(f"{base}/api/tex")
            assert status == 200
            assert b"\\documentclass" in tex_body or b"documentclass" in tex_body

            pdf = workspace / "generated" / "resume.pdf"
            if pdf.exists():
                status, pdf_body, ctype = http_get(f"{base}/api/pdf")
                assert status == 200
                assert pdf_body[:4] == b"%PDF"
                assert "pdf" in ctype

    def test_save_invalid_yaml_still_writes(self, http_server):
        base, workspace, _ = http_server
        status, body, _ = http_post(
            f"{base}/api/save?template=classic&profile=personal",
            "not: [valid: yaml: {{",
            content_type="text/plain",
        )
        assert status == 200
        resp = json.loads(body)
        assert resp["ok"] is False
        assert resp["error"]

    def test_pdf_404_before_build(self, http_server):
        base, workspace, _ = http_server
        pdf = workspace / "generated" / "resume.pdf"
        if pdf.exists():
            pdf.unlink()
        with pytest.raises(urllib.error.HTTPError) as exc:
            http_get(f"{base}/api/pdf")
        assert exc.value.code == 404

    def test_tex_404_before_build(self, http_server):
        base, workspace, _ = http_server
        tex = workspace / "generated" / "resume.tex"
        if tex.exists():
            tex.unlink()
        with pytest.raises(urllib.error.HTTPError) as exc:
            http_get(f"{base}/api/tex")
        assert exc.value.code == 404


class TestBuildPipeline:
    def test_build_generates_tex(self, tmp_workspace):
        workspace, mod = tmp_workspace
        details = workspace / "templates" / "classic" / "details.personal.yml"
        error, warning, pages = mod.run_build("classic", str(details))
        tex = workspace / "generated" / "resume.tex"
        assert tex.exists()
        content = tex.read_text()
        assert "documentclass" in content.lower() or "\\begin" in content

    def test_build_pdf_when_latexmk_available(self, tmp_workspace):
        if shutil.which("latexmk") is None:
            pytest.skip("latexmk not installed")
        workspace, mod = tmp_workspace
        details = workspace / "templates" / "classic" / "details.personal.yml"
        error, warning, pages = mod.run_build("classic", str(details))
        pdf = workspace / "generated" / "resume.pdf"
        assert pdf.exists(), error or "PDF not generated"
        assert pages is not None or (workspace / "generated" / "resume.log").exists()
