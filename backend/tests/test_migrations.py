from alembic import command
from alembic.config import Config
from sqlalchemy import inspect
from sqlalchemy import text

from app.database import make_database
from app.cli import seed


def test_migration_and_repeatable_seed(tmp_path):
    url = f"sqlite:///{tmp_path / 'migrated.db'}"
    config = Config("alembic.ini")
    config.set_main_option("sqlalchemy.url", url)
    command.upgrade(config, "head")
    engine, factory = make_database(url)
    assert set(inspect(engine).get_table_names()) == {"users", "vehicles", "alembic_version", "orders", "wishlist", "test_drives"}
    with factory() as session:
        assert seed(session) is True
        assert seed(session) is False
    engine.dispose()


def test_upgrade_preserves_old_accounts_prices_and_stock(tmp_path):
    url = f"sqlite:///{tmp_path / 'legacy.db'}"
    config = Config("alembic.ini")
    config.set_main_option("sqlalchemy.url", url)
    command.upgrade(config, "0001")
    engine, _ = make_database(url)
    with engine.begin() as connection:
        connection.execute(text("INSERT INTO users VALUES (1, 'old@example.com', 'existing-hash', 'customer')"))
        connection.execute(text("INSERT INTO vehicles VALUES (1, 'Toyota', 'RAV4', 'SUV', 3650000, 3)"))
    engine.dispose()
    command.upgrade(config, "head")
    engine, _ = make_database(url)
    with engine.connect() as connection:
        assert tuple(connection.execute(text("SELECT price_cents,quantity,currency FROM vehicles WHERE id=1")).one()) == (3650000, 3, "USD")
        assert connection.scalar(text("SELECT password_hash FROM users WHERE id=1")) == "existing-hash"
    engine.dispose()
    command.downgrade(config, "base")
    engine, _ = make_database(url)
    assert inspect(engine).get_table_names() == ["alembic_version"]
    engine.dispose()
