"""Configuration for the FleetAI Admin service.

The admin panel reuses the main backend's database and models, so the database
URI is resolved to the *same* SQLite file the main backend uses.
"""

import os

from dotenv import load_dotenv

from bootstrap import ADMIN_BACKEND_DIR, MAIN_BACKEND_DIR

load_dotenv(os.path.join(ADMIN_BACKEND_DIR, '.env'))

# The main backend stores its SQLite file inside backend/instance/.
MAIN_INSTANCE_DIR = os.path.join(MAIN_BACKEND_DIR, 'instance')
MAIN_DATABASE_PATH = os.path.join(MAIN_INSTANCE_DIR, 'fleet_management.db')

#: Roles allowed to sign in to the admin panel. The main application's public
#: /auth/register endpoint assigns 'admin' to every new signup, so 'admin' is
#: deliberately excluded here to avoid a privilege-escalation path.
ADMIN_ROLES = ('superadmin',)

#: Roles assignable to platform users through the admin panel.
ASSIGNABLE_ROLES = ('admin', 'user', 'viewer', 'superadmin')


def _database_uri():
    """Resolve the shared database URI.

    An explicit ``DATABASE_URL`` wins. A bare ``sqlite:///name.db`` is resolved
    against the main backend's instance folder so both services always point at
    the same file. Absolute URIs are passed through untouched.
    """
    configured = (os.environ.get('DATABASE_URL') or '').strip()
    if not configured:
        return 'sqlite:///' + MAIN_DATABASE_PATH.replace('\\', '/')

    prefix = 'sqlite:///'
    if configured.startswith(prefix) and not configured.startswith('sqlite:////'):
        relative = configured[len(prefix):]
        if not relative.endswith('.db'):
            relative = os.path.join(relative, 'fleet_management.db')
        return prefix + os.path.join(MAIN_INSTANCE_DIR, relative).replace('\\', '/')
    return configured


class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'admin-dev-secret-key-change-in-production'
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'admin-jwt-secret-key-change-in-production'
    SQLALCHEMY_DATABASE_URI = _database_uri()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_ACCESS_TOKEN_EXPIRES = int(os.environ.get('JWT_ACCESS_TOKEN_EXPIRES') or 28800)  # 8 hours
    JWT_ERROR_MESSAGE_KEY = 'error'

    MAIN_BACKEND_DIR = MAIN_BACKEND_DIR
    ADMIN_BACKEND_DIR = ADMIN_BACKEND_DIR

    #: Browser origins allowed to call this service (comma separated).
    ADMIN_FRONTEND_URL = os.environ.get('ADMIN_FRONTEND_URL') or 'http://localhost:5175'
