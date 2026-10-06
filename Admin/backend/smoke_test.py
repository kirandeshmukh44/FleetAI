"""End-to-end smoke test for the FleetAI Admin API.

Exercises every admin endpoint against the real (shared) SQLite database using
Flask's test client. Run with:

    python smoke_test.py
"""

import os
import sys

from sqlalchemy import func

import bootstrap  # noqa: F401  (extends sys.path)

from app.database.db import db
from app.models import User
from admin_app import create_app

PASSED = []
FAILED = []


def check(label, condition, detail=''):
    (PASSED if condition else FAILED).append(label)
    status = 'PASS' if condition else 'FAIL'
    print(f'  [{status}] {label}{f" -> {detail}" if detail and not condition else ""}')


def provision(app, username, password):
    """Ensure a superadmin exists for the test run."""
    with app.app_context():
        user = User.query.filter(func.lower(User.username) == username).first()
        if not user:
            user = User(
                username=username,
                email=f'{username}@fleetai.com',
                full_name='Smoke Test Admin',
                role='superadmin',
            )
            db.session.add(user)
        user.role = 'superadmin'
        user.set_password(password)
        db.session.commit()
        db.session.close()


def main():
    app = create_app()
    admin_username = os.environ.get('ADMIN_TEST_USER', 'superadmin')
    admin_password = os.environ.get('ADMIN_TEST_PASS', 'admin123')
    provision(app, admin_username, admin_password)

    client = app.test_client()
    headers = {}

    print('\n== Public endpoints ==')
    response = client.get('/api/admin')
    check('GET /api/admin index', response.status_code == 200, response.data[:200])

    response = client.get('/api/admin/system/health')
    check('GET /api/admin/system/health', response.status_code == 200, response.data[:200])

    print('\n== Auth guards (must reject) ==')
    response = client.get('/api/admin/users/')
    check('users list rejects anonymous', response.status_code == 401, response.status_code)
    response = client.get('/api/admin/overview/stats')
    check('stats rejects anonymous', response.status_code == 401, response.status_code)

    print('\n== Login ==')
    response = client.post(
        '/api/admin/auth/login', json={'username': 'nobody', 'password': 'wrongpassword'}
    )
    check('login rejects bad credentials', response.status_code == 401, response.status_code)

    # A valid password on a non-superadmin account must still be refused.
    plain_username = None
    with app.app_context():
        plain = User.query.filter(User.role != 'superadmin').first()
        if plain:
            plain.set_password('plainpass123')
            db.session.commit()
            plain_username = plain.username
        db.session.close()

    if plain_username:
        response = client.post(
            '/api/admin/auth/login', json={'username': plain_username, 'password': 'plainpass123'}
        )
        check(
            'login rejects non-superadmin role',
            response.status_code == 403,
            f'{response.status_code} {response.data[:160]}',
        )

    response = client.post(
        '/api/admin/auth/login', json={'username': admin_username, 'password': admin_password}
    )
    if response.status_code != 200:
        print(f'  [FAIL] superadmin login -> {response.status_code} {response.data[:300]}')
        return 1
    token = response.get_json()['access_token']
    headers = {'Authorization': f'Bearer {token}'}
    check('superadmin login', True)

    print('\n== Authenticated reads ==')
    for label, url in (
        ('me', '/api/admin/auth/me'),
        ('sessions', '/api/admin/auth/sessions'),
        ('stats', '/api/admin/overview/stats'),
        ('trends', '/api/admin/overview/trends'),
        ('top vehicles', '/api/admin/overview/top-vehicles'),
        ('risk breakdown', '/api/admin/overview/risk-breakdown'),
        ('users list', '/api/admin/users/'),
        ('audit logs', '/api/admin/users/audit-logs'),
        ('vehicles list', '/api/admin/fleet/vehicles'),
        ('drivers list', '/api/admin/fleet/drivers'),
        ('system info', '/api/admin/system/info'),
        ('settings', '/api/admin/system/settings'),
        ('notifications', '/api/admin/system/notifications'),
    ):
        response = client.get(url, headers=headers)
        check(f'GET {url}', response.status_code == 200, f'{response.status_code} {response.data[:200]}')

    print('\n== Pagination / search / filter ==')
    response = client.get('/api/admin/users/?page=1&per_page=1', headers=headers)
    payload = response.get_json() or {}
    check('users pagination envelope', response.status_code == 200 and 'total' in payload, response.data[:200])
    check('per_page honoured', len(payload.get('items', [])) <= 1, len(payload.get('items', [])))

    response = client.get(f'/api/admin/users/?search={admin_username}', headers=headers)
    check('user search', response.status_code == 200 and (response.get_json() or {}).get('total', 0) >= 1)

    response = client.get('/api/admin/fleet/vehicles?status=ACTIVE', headers=headers)
    check('vehicle status filter', response.status_code == 200, response.data[:200])

    response = client.get('/api/admin/fleet/drivers?risk_level=HIGH', headers=headers)
    check('driver risk filter', response.status_code == 200, response.data[:200])

    return detail_checks(client, headers, admin_username, app)


def detail_checks(client, headers, admin_username, app):
    """Detail endpoints, governance, settings and error handling."""
    print('\n== Detail endpoints ==')
    listing = client.get('/api/admin/fleet/vehicles', headers=headers).get_json() or {}
    if listing.get('items'):
        vid = listing['items'][0]['id']
        response = client.get(f'/api/admin/fleet/vehicles/{vid}', headers=headers)
        check('vehicle detail', response.status_code == 200, response.data[:200])

        response = client.put(
            f'/api/admin/fleet/vehicles/{vid}', json={'status': 'IDLE'}, headers=headers
        )
        check('vehicle update', response.status_code == 200, response.data[:200])
        updated = response.get_json() or {}
        check('vehicle update echoed', updated.get('status') == 'IDLE', updated.get('status'))
        # Re-read from the database to prove the change was committed.
        refetched = client.get(f'/api/admin/fleet/vehicles/{vid}', headers=headers).get_json() or {}
        check('vehicle update persisted', refetched.get('status') == 'IDLE', refetched.get('status'))

        response = client.put(
            f'/api/admin/fleet/vehicles/{vid}', json={'status': 'BOGUS'}, headers=headers
        )
        check('vehicle rejects invalid status', response.status_code == 400, response.status_code)

        response = client.put(f'/api/admin/fleet/vehicles/{vid}', json={'nope': 1}, headers=headers)
        check('vehicle rejects unknown field', response.status_code == 400, response.status_code)

    dlisting = client.get('/api/admin/fleet/drivers', headers=headers).get_json() or {}
    if dlisting.get('items'):
        did = dlisting['items'][0]['id']
        response = client.get(f'/api/admin/fleet/drivers/{did}', headers=headers)
        check('driver detail', response.status_code == 200, response.data[:200])
        response = client.put(
            f'/api/admin/fleet/drivers/{did}', json={'status': 'ON_LEAVE'}, headers=headers
        )
        check('driver update', response.status_code == 200, response.data[:200])

    print('\n== User governance ==')
    response = client.post(
        '/api/admin/users/',
        json={
            'username': 'smoketestuser',
            'email': 'smoketest@fleetai.com',
            'full_name': 'Smoke Test',
            'password': 'testpass123',
            'role': 'user',
        },
        headers=headers,
    )
    check('create user', response.status_code == 201, response.data[:200])
    created_id = (response.get_json() or {}).get('id')

    response = client.post(
        '/api/admin/users/',
        json={'username': 'smoketestuser', 'email': 'other@fleetai.com', 'password': 'testpass123'},
        headers=headers,
    )
    check('duplicate username rejected', response.status_code == 409, response.status_code)

    response = client.post(
        '/api/admin/users/',
        json={'username': 'x', 'email': 'bad', 'password': 'testpass123'},
        headers=headers,
    )
    check('invalid user rejected', response.status_code == 400, response.status_code)

    if created_id:
        response = client.get(f'/api/admin/users/{created_id}', headers=headers)
        check('get user', response.status_code == 200, response.data[:200])

        response = client.put(
            f'/api/admin/users/{created_id}', json={'role': 'viewer'}, headers=headers
        )
        check('update user role', response.status_code == 200, response.data[:200])

        response = client.delete(f'/api/admin/users/{created_id}', headers=headers)
        check('delete user', response.status_code == 200, response.data[:200])

    with app.app_context():
        me = User.query.filter(func.lower(User.username) == admin_username).first()
        me_id = me.id if me else None
        db.session.close()
    if me_id:
        response = client.delete(f'/api/admin/users/{me_id}', headers=headers)
        check('cannot delete own account', response.status_code == 400, response.status_code)

    print('\n== System settings ==')
    response = client.put(
        '/api/admin/system/settings/maintenance_mode', json={'value': 'true'}, headers=headers
    )
    check('update boolean setting', response.status_code == 200, response.data[:200])

    response = client.put(
        '/api/admin/system/settings/alerts_high_risk_threshold',
        json={'value': 'notanumber'},
        headers=headers,
    )
    check('rejects non-numeric for number setting', response.status_code == 400, response.status_code)

    response = client.put(
        '/api/admin/system/settings/unknown_key_xyz', json={'value': '1'}, headers=headers
    )
    check('rejects unknown setting', response.status_code == 404, response.status_code)

    print('\n== Notifications & health sweep ==')
    response = client.post(
        '/api/admin/system/notifications',
        json={'severity': 'info', 'title': 'Smoke test note', 'message': 'Automated check'},
        headers=headers,
    )
    check('create notification', response.status_code == 201, response.data[:200])
    note_id = (response.get_json() or {}).get('id')

    response = client.post('/api/admin/system/check', headers=headers)
    check('health sweep', response.status_code == 200, response.data[:200])

    if note_id:
        response = client.post(f'/api/admin/system/notifications/{note_id}/resolve', headers=headers)
        check('resolve notification', response.status_code == 200, response.data[:200])

    print('\n== Error handling ==')
    response = client.get('/api/admin/does-not-exist', headers=headers)
    check('404 handler returns JSON', response.status_code == 404 and response.is_json, response.status_code)
    response = client.delete('/api/admin/overview/stats', headers=headers)
    check('405 handler returns JSON', response.status_code == 405 and response.is_json, response.status_code)

    print('\n== Audit trail ==')
    response = client.get('/api/admin/users/audit-logs?per_page=100', headers=headers)
    logs = (response.get_json() or {}).get('items', [])
    actions = {log['action'] for log in logs}
    check('audit log populated', len(logs) > 0, len(logs))
    for expected in ('user.created', 'user.deleted', 'setting.updated'):
        check(f'audit recorded {expected}', expected in actions, sorted(actions))

    print('\n' + '=' * 56)
    print(f'PASSED: {len(PASSED)}   FAILED: {len(FAILED)}')
    if FAILED:
        print('Failures:')
        for item in FAILED:
            print('  -', item)
    print('=' * 56)
    return 1 if FAILED else 0


if __name__ == '__main__':
    sys.exit(main())

