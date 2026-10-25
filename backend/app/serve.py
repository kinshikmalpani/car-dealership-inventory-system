"""Container startup: migrate, seed, provision demo admin, then serve."""
import os

from alembic import command
from alembic.config import Config
from sqlalchemy import inspect, select
import uvicorn

from app.catalogue import seed_india
from app.config import Settings
from app.database import make_database
from app.models import User
from app.schemas import Register
from app.security import password_hasher


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


def provision_admin(database_url: str):
    email = os.environ.get("BOOTSTRAP_ADMIN_EMAIL")
    password = os.environ.get("BOOTSTRAP_ADMIN_PASSWORD")

    if not email and not password:
        print("Admin bootstrap skipped: no credentials configured.")
        return

    if not email or not password:
        raise RuntimeError(
            "Set both BOOTSTRAP_ADMIN_EMAIL and "
            "BOOTSTRAP_ADMIN_PASSWORD."
        )

    credentials = Register(email=email, password=password)
    engine, factory = make_database(database_url)

    try:
        with factory() as session:
            user = session.scalar(
                select(User).where(
                    User.email == str(credentials.email)
                )
            )

            if user is not None and user.role != "admin":
                raise RuntimeError(
                    "Bootstrap email belongs to a customer. "
                    "Choose a different email for the admin."
                )

            password_hash = password_hasher.hash(
                credentials.password
            )

            if user is None:
                user = User(
                    email=str(credentials.email),
                    password_hash=password_hash,
                    role="admin",
                )
                session.add(user)
                print("Demo admin account created.")
            else:
                user.password_hash = password_hash
                print("Demo admin password synchronized.")

            session.commit()
    finally:
        engine.dispose()


def main():
    settings = Settings()

    if (
        len(settings.jwt_secret) < 32
        or settings.jwt_secret.startswith("replace-with")
    ):
        raise RuntimeError(
            "Configure a strong JWT_SECRET before starting the service"
        )

    prepare_database(settings.database_url)
    provision_admin(settings.database_url)

    uvicorn.run(
        "app.main:create_app",
        factory=True,
        host="0.0.0.0",
        port=int(os.environ.get("PORT", "8000")),
        workers=1,
    )


if __name__ == "__main__":
    main()
