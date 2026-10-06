"""Run the complete Admin module as one production WSGI service.

Usage from the repository root:

    python Admin/run.py

Build the frontend once before deployment with ``npm run build`` in
``Admin/frontend``. The service then serves both the React application and the
Flask API from the same origin.
"""

import os
import sys


ADMIN_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ADMIN_DIR, 'backend')
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from admin_app import PORT, create_app  # noqa: E402


app = create_app()


if __name__ == '__main__':
    from waitress import serve

    host = os.environ.get('ADMIN_HOST', '0.0.0.0')
    port = int(os.environ.get('ADMIN_PORT', PORT))
    serve(app, host=host, port=port)
