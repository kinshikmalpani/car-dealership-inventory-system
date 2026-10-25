"""Container startup: migrate, seed only a fresh database, then serve one worker."""
import os

from alembic import command
from alembic.config import Config
from sqlalchemy import inspect
import uvicorn

from app.catalogue import seed_india
from app.config import Settings
from app.database import make_database


def prepare_database(database_url: str):
    engine, factory = make_database(database_url)
    try:
        fresh = not inspect(engine).has_table("users")
        config = Config("alembic.ini")
        config.set_main_option("sqlalchemy.url", database_url)
        command.upgrade(config, "head")
        if fresh:
            with factory() as session:
                seed_india(session)
    finally:
        engine.dispose()


def main():
    settings = Settings()
    if len(settings.jwt_secret) < 32 or settings.jwt_secret.startswith("replace-with"):
        raise RuntimeError("Configure a strong JWT_SECRET before starting the service")
    prepare_database(settings.database_url)
    uvicorn.run("app.main:create_app", factory=True, host="0.0.0.0", port=int(os.environ.get("PORT", "8000")), workers=1)


if __name__ == "__main__":
    main()
