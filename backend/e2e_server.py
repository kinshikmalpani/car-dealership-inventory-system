"""An isolated, loopback-only server used exclusively by Playwright."""
import os
from pathlib import Path
from tempfile import TemporaryDirectory

import uvicorn
from alembic import command
from alembic.config import Config

from app.cli import seed
from app.database import make_database
from app.main import create_app
from app.models import User
from app.security import password_hasher


def main():
    with TemporaryDirectory(prefix="motorroom-e2e-") as directory:
        url = "sqlite:///" + (Path(directory) / "e2e.db").as_posix()
        config = Config("alembic.ini")
        config.set_main_option("sqlalchemy.url", url)
        command.upgrade(config, "head")
        engine, factory = make_database(url)
        with factory() as session:
            for role in ("admin", "customer"):
                session.add(User(email=f"{role}@example.com", password_hash=password_hasher.hash("E2ePassword123!"), role=role))
            session.commit()
            seed(session)
        engine.dispose()
        application = create_app(url, "isolated-e2e-server-secret-at-least-32-characters")
        uvicorn.run(application, host="127.0.0.1", port=int(os.environ.get("E2E_PORT", "8000")))


if __name__ == "__main__":
    main()
