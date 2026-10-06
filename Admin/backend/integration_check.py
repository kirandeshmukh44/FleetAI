"""Live end-to-end check against a running admin API + dev server.

    python integration_check.py
"""

import json
import urllib.error
import urllib.request

API = 'http://localhost:5001/api/admin'
WEB = 'http://localhost:5175'

RESULTS = []


def check(label, condition, detail=''):
    RESULTS.append((label, condition))
    suffix = f' -> {detail}' if detail and not condition else ''
    print(f"  [{'PASS' if condition else 'FAIL'}] {label}{suffix}")


def request(method, url, token=None, body=None, expect_json=True):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header('Content-Type', 'application/json')
    if token:
        req.add_header('Authorization', f'Bearer {token}')
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            payload = response.read().decode()
            return response.status, (json.loads(payload) if expect_json and payload else payload)
    except urllib.error.HTTPError as error:
        payload = error.read().decode()
        try:
            return error.code, json.loads(payload)
        except ValueError:
            return error.code, payload


def main():
    print('\n== Frontend dev server ==')
    status, _ = request('GET', WEB, expect_json=False)
    check('admin frontend serves on :5175', status == 200, status)

    print('\n== Public API ==')
    status, payload = request('GET', f'{API}/system/health')
    check('health endpoint', status == 200 and payload.get('status') == 'ok', payload)

    print('\n== Auth ==')
    status, _ = request('GET', f'{API}/users/')
    check('unauthenticated list rejected', status == 401, status)

    # A well-formed but incorrect password must return 401 (not 400).
    status, _ = request('POST', f'{API}/auth/login', body={'username': 'superadmin', 'password': 'wrongpass123'})
    check('bad password rejected with 401', status == 401, status)

    # A malformed password (too short) is caught by validation first.
    status, _ = request('POST', f'{API}/auth/login', body={'username': 'superadmin', 'password': 'abc'})
    check('malformed password rejected with 400', status == 400, status)

    status, payload = request('POST', f'{API}/auth/login', body={'username': 'superadmin', 'password': 'admin123'})
    if status != 200:
        check('superadmin login', False, f'{status} {payload}')
        return 1
    token = payload['access_token']
    check('superadmin login', True)
    check('login returns superadmin role', payload['user']['role'] == 'superadmin', payload['user'])

    status, payload = request('GET', f'{API}/auth/me', token=token)
    check('session identity', status == 200 and payload['username'] == 'superadmin', payload)

    print('\n== Dashboard data ==')
    status, stats = request('GET', f'{API}/overview/stats', token=token)
    check('platform stats', status == 200 and 'kpis' in stats, stats)
    if status == 200:
        kpis = stats['kpis']
        check('stats count vehicles', kpis['total_vehicles'] > 0, kpis)
        check('stats count drivers', kpis['total_drivers'] > 0, kpis)
        print(
            f"        vehicles={kpis['total_vehicles']} drivers={kpis['total_drivers']} "
            f"users={kpis['total_users']} journeys={kpis['total_journeys']}"
        )

    status, trends = request('GET', f'{API}/overview/trends', token=token)
    check('trends series', status == 200 and isinstance(trends.get('trends'), list), trends)

    status, top = request('GET', f'{API}/overview/top-vehicles', token=token)
    check('top vehicles', status == 200 and isinstance(top, list), top)

    status, risk = request('GET', f'{API}/overview/risk-breakdown', token=token)
    check('risk breakdown', status == 200 and 'by_level' in risk, risk)

    return crud_and_fleet_checks(token)



def crud_and_fleet_checks(token):
    print('\n== CRUD round trip ==')
    status, created = request(
        'POST', f'{API}/users/',
        token=token,
        body={
            'username': 'integrationuser',
            'email': 'integration@fleetai.com',
            'full_name': 'Integration User',
            'password': 'testpass123',
            'role': 'user',
        },
    )
    check('create user', status == 201, f'{status} {created}')
    new_id = created.get('id') if isinstance(created, dict) else None

    if new_id:
        status, payload = request('PUT', f'{API}/users/{new_id}', token=token, body={'role': 'viewer'})
        check('update user role', status == 200 and payload['role'] == 'viewer', payload)

        status, payload = request('DELETE', f'{API}/users/{new_id}', token=token)
        check('delete user', status == 200, payload)

    status, _ = request('POST', f'{API}/users/', token=token, body={'username': 'bad', 'email': 'nope'})
    check('validation rejects bad input', status == 400, status)

    print('\n== Fleet oversight ==')
    status, vehicles = request('GET', f'{API}/fleet/vehicles', token=token)
    check('list vehicles', status == 200 and 'items' in vehicles, status)
    if vehicles.get('items'):
        vid = vehicles['items'][0]['id']
        status, payload = request('GET', f'{API}/fleet/vehicles/{vid}', token=token)
        check('vehicle detail', status == 200 and payload['id'] == vid, status)

        original = payload['status']
        new_status = 'STOPPED' if original != 'STOPPED' else 'ACTIVE'
        status, payload = request('PUT', f'{API}/fleet/vehicles/{vid}', token=token, body={'status': new_status})
        check('vehicle status override', status == 200 and payload['status'] == new_status, payload.get('status'))

        status, payload = request('GET', f'{API}/fleet/vehicles/{vid}', token=token)
        check('override persisted', payload['status'] == new_status, payload.get('status'))

        # Restore so repeated runs stay idempotent.
        request('PUT', f'{API}/fleet/vehicles/{vid}', token=token, body={'status': original})

    status, drivers = request('GET', f'{API}/fleet/drivers', token=token)
    check('list drivers', status == 200 and 'items' in drivers, status)
    if drivers.get('items'):
        did = drivers['items'][0]['id']
        status, _ = request('GET', f'{API}/fleet/drivers/{did}', token=token)
        check('driver detail', status == 200, status)

    print('\n== System ==')
    status, info = request('GET', f'{API}/system/info', token=token)
    check('system info', status == 200 and 'table_counts' in info, status)

    status, settings = request('GET', f'{API}/system/settings', token=token)
    check('settings seeded', status == 200 and len(settings) >= 5, settings)

    status, payload = request('POST', f'{API}/system/check', token=token)
    check('health sweep', status == 200 and 'raised' in payload, payload)

    status, logs = request('GET', f'{API}/users/audit-logs?per_page=50', token=token)
    actions = {log['action'] for log in logs.get('items', [])}
    check('audit captured CRUD', {'user.created', 'user.updated', 'user.deleted'} <= actions, sorted(actions))

    failed = [label for label, ok in RESULTS if not ok]
    print('\n' + '=' * 56)
    print(f'PASSED: {len(RESULTS) - len(failed)}   FAILED: {len(failed)}')
    for label in failed:
        print('  -', label)
    print('=' * 56)
    return 1 if failed else 0


if __name__ == '__main__':
    raise SystemExit(main())
