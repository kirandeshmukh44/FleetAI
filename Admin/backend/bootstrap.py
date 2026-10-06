"""Make the shared FleetAI backend package importable by the admin service.

The admin panel is a *separate* Flask application, but it must operate on the
exact same database and SQLAlchemy models as the main backend. Instead of
duplicating the schema we put the main ``backend/`` folder on ``sys.path`` so
``app.models`` / ``app.database.db`` / ``app.utils.validation`` resolve to the
real project modules.
"""

import os
import sys

# Admin/backend/bootstrap.py -> Admin/backend -> Admin -> <project root>
ADMIN_BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(os.path.dirname(ADMIN_BACKEND_DIR))
MAIN_BACKEND_DIR = os.path.join(PROJECT_ROOT, 'backend')


def install_shared_backend():
    """Insert the main backend directory at the front of ``sys.path``."""
    if MAIN_BACKEND_DIR not in sys.path:
        sys.path.insert(0, MAIN_BACKEND_DIR)
    return MAIN_BACKEND_DIR


install_shared_backend()
