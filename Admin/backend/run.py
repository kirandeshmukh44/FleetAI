"""Entry point for the FleetAI Admin API.

    python run.py      -> http://localhost:5001
"""

from admin_app import PORT, create_app

app = create_app()

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=PORT)
