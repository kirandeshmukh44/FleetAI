"""Reset application data while keeping datasets and trained model artifacts."""
import argparse
from pathlib import Path

from app import create_app
from app.database.db import db


def reset_database():
    app = create_app()
    database_path = Path(app.instance_path) / "fleet_management.db"
    if database_path.exists() and app.config.get("SQLALCHEMY_DATABASE_URI", "").startswith("sqlite"):
        with app.app_context():
            db.engine.dispose()
        database_path.unlink()
    with app.app_context():
        db.create_all()
    print("Application data reset. Register a new user to start with a fresh workspace.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--yes",
        action="store_true",
        help="Confirm deletion of all application users and operational records.",
    )
    args = parser.parse_args()
    if not args.yes:
        raise SystemExit("Refusing to reset data without --yes")
    reset_database()