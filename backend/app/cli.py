"""Local administration: python -m app.cli create-admin / seed."""
import argparse
from getpass import getpass

from sqlalchemy import select

from app.config import Settings
from app.database import make_database
from app.models import User
from app.schemas import Register
from app.security import password_hasher

def seed(session):
    from app.catalogue import seed_india
    return seed_india(session)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)
    admin = subparsers.add_parser("create-admin", help="Create a new admin; never promotes an existing account")
    admin.add_argument("--email", required=True)
    subparsers.add_parser("seed", help="Add missing Indian catalogue models without overwriting inventory")
    args = parser.parse_args()
    engine, factory = make_database(Settings().database_url)
    try:
        with factory() as session:
            if args.command == "seed":
                print("Example vehicles added." if seed(session) else "Indian catalogue models already exist; nothing changed.")
                return
            password = getpass("New admin password (at least 10 characters): ")
            if password != getpass("Confirm password: "):
                parser.error("Passwords do not match.")
            credentials = Register(email=args.email, password=password)
            if session.scalar(select(User).where(User.email == str(credentials.email))):
                parser.error("This email already has an account. Use a new email.")
            session.add(User(email=str(credentials.email), password_hash=password_hasher.hash(credentials.password), role="admin"))
            session.commit()
            print("Admin account created.")
    finally:
        engine.dispose()


if __name__ == "__main__":
    main()
