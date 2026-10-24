"""Local administration: python -m app.cli create-admin / seed."""
import argparse
from getpass import getpass

from sqlalchemy import select

from app.config import Settings
from app.database import make_database
from app.models import User, Vehicle
from app.schemas import Register
from app.security import password_hasher

SAMPLE_VEHICLES = [
    ("Volvo", "XC60", "SUV", 4750000, 4),
    ("BMW", "330i", "Sedan", 4490000, 3),
    ("Toyota", "RAV4 Hybrid", "SUV", 3650000, 7),
    ("Porsche", "718 Cayman", "Coupe", 7290000, 0),
    ("Mercedes-Benz", "C 300", "Sedan", 4695000, 2),
    ("Audi", "Q5", "SUV", 4590000, 5),
]


def seed(session):
    if session.scalar(select(Vehicle.id).limit(1)) is not None:
        return False
    for make, model, category, price_cents, quantity in SAMPLE_VEHICLES:
        session.add(Vehicle(make=make, model=model, category=category, price_cents=price_cents, quantity=quantity))
    session.commit()
    return True


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)
    admin = subparsers.add_parser("create-admin", help="Create a new admin; never promotes an existing account")
    admin.add_argument("--email", required=True)
    subparsers.add_parser("seed", help="Add example vehicles only when inventory is empty")
    args = parser.parse_args()
    engine, factory = make_database(Settings().database_url)
    try:
        with factory() as session:
            if args.command == "seed":
                print("Example vehicles added." if seed(session) else "Inventory already has vehicles; nothing changed.")
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
