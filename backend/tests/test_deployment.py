from fastapi.testclient import TestClient
from app.main import create_app


def test_production_frontend_preserves_api_and_limits_file_access(tmp_path, monkeypatch):
    public = tmp_path / "public"
    public.mkdir()
    (public / "index.html").write_text("<h1>Motorroom</h1>")
    (public / "assets").mkdir()
    (public / "assets" / "app.js").write_text("console.log('motorroom')")
    (tmp_path / "secret.txt").write_text("private-file")
    monkeypatch.setenv("FRONTEND_DIST", str(public))
    app = create_app(database_url=f"sqlite:///{tmp_path / 'test.db'}", jwt_secret="test-only-deployment-secret-32-characters", initialize_database=True)
    with TestClient(app) as client:
        assert client.get("/").text == "<h1>Motorroom</h1>"
        assert client.get("/assets/app.js").status_code == 200
        assert client.get("/api/health").status_code == 200
        assert client.get("/api/vehicles").status_code == 401
        assert client.get("/api/nonexistent").status_code == 404
        assert client.get("/missing.js").status_code == 404
        assert "private-file" not in client.get("/%2e%2e/secret.txt").text
