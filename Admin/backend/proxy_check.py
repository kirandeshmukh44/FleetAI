"""Verify the full flow through the Vite dev-server proxy (port 5175)."""

import json
import urllib.error
import urllib.request

BASE = 'http://localhost:5175/api/admin'
FAILED = []


def call(method, path, token=None, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(f'{BASE}{path}', data=data, method=method)
    req.add_header('Content-Type', 'application/json')
    if token:
        req.add_header('Authorization', f'Bearer {token}')
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            return response.status, json.loads(response.read().decode() or '{}')
    except urllib.error.HTTPError as error:
        try:
            return error.code, json.loads(error.read().decode())
        except ValueError:
            return error.code, {}


def main():
    print('Flow through the frontend proxy (5175 -> 5001):\n')

    status, payload = call('POST', '/auth/login', body={'username': 'superadmin', 'password': 'admin123'})
    print(f"  login           -> {status}")
    if status != 200:
        print('  FAILED to authenticate through the proxy')
        return 1
    token = payload['access_token']

    endpoints = [
        ('/auth/me', 'session identity'),
        ('/overview/stats', 'platform KPIs'),
        ('/overview/trends', '30-day trends'),
        ('/overview/top-vehicles', 'mileage leaderboard'),
        ('/overview/risk-breakdown', 'risk breakdown'),
        ('/users/?per_page=5', 'user list'),
        ('/users/audit-logs?per_page=5', 'audit log'),
        ('/fleet/vehicles?per_page=5', 'vehicle list'),
        ('/fleet/drivers?per_page=5', 'driver list'),
        ('/system/info', 'system info'),
        ('/system/settings', 'platform settings'),
        ('/system/notifications', 'notifications'),
    ]

    for path, label in endpoints:
        status, _ = call('GET', path, token=token)
        print(f"  {label:20s} -> {status}")
        if status != 200:
            FAILED.append(label)

    print()
    if FAILED:
        print('FAILED:', ', '.join(FAILED))
        return 1
    print(f'All {len(endpoints)} endpoints responded 200 through the proxy.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
