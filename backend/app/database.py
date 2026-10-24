from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker


def make_database(url: str):
    engine = create_engine(url, connect_args={"check_same_thread": False, "timeout": 30})

    @event.listens_for(engine, "connect")
    def configure_sqlite(connection, _):
        cursor = connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA busy_timeout=30000")
        cursor.close()

    return engine, sessionmaker(engine, expire_on_commit=False)
