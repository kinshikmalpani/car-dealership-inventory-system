from alembic import command
from alembic.config import Config
from sqlalchemy import inspect

from app.database import make_database
from app.cli import seed


def test_migration_and_repeatable_seed(tmp_path):
    url = f"sqlite:///{tmp_path / 'migrated.db'}"
    config = Config("alembic.ini")
    config.set_main_option("sqlalchemy.url", url)
    command.upgrade(config, "head")
    engine, factory = make_database(url)
    assert set(inspect(engine).get_table_names()) == {"users", "vehicles", "alembic_version"}
    with factory() as session:
        assert seed(session) is True
        assert seed(session) is False
    engine.dispose()
    command.downgrade(config, "base")
    engine, _ = make_database(url)
    assert inspect(engine).get_table_names() == ["alembic_version"]
    engine.dispose()
