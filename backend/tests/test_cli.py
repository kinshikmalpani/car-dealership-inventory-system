import sys

import pytest
from sqlalchemy import select

from app import cli
from app.config import Settings
from app.database import make_database
from app.models import Base, User
from app.security import password_hasher


def test_admin_cli_requires_new_account_and_matching_passwords(tmp_path, monkeypatch):
    url = f"sqlite:///{tmp_path / 'admin.db'}"
    engine, factory = make_database(url)
    Base.metadata.create_all(engine)
    monkeypatch.setattr(cli, "Settings", lambda: Settings(database_url=url))
    monkeypatch.setattr(sys, "argv", ["cli", "create-admin", "--email", "owner@example.com"])
    monkeypatch.setattr(cli, "getpass", lambda _: "SafePassword123!")
    cli.main()
    with factory() as session:
        user = session.scalar(select(User))
        assert user.role == "admin"
        assert password_hasher.verify("SafePassword123!", user.password_hash)
    with pytest.raises(SystemExit):
        cli.main()
    passwords = iter(["SafePassword123!", "DifferentPassword123!"])
    monkeypatch.setattr(cli, "getpass", lambda _: next(passwords))
    with pytest.raises(SystemExit):
        cli.main()
    monkeypatch.setattr(sys, "argv", ["cli", "seed"])
    cli.main()
    engine.dispose()
