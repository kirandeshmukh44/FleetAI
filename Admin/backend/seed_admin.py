"""Create or promote a superadmin account for the admin panel.

The admin panel deliberately requires ``role == 'superadmin'``. The main
application's public registration endpoint grants every signup the ``admin``
role, so 'admin' is not treated as sufficient for panel access.

Usage
-----
    python seed_admin.py
    python seed_admin.py --username opsadmin --email ops@fleetai.com --password 'S3curePass!'

If the username or email already exists the account is promoted to superadmin
and its password is reset to the supplied value.
"""

import argparse
import getpass
import sys

from sqlalchemy import func

import bootstrap  # noqa: F401  (extends sys.path)

from app.database.db import db
from app.models import User
from app.utils.validation import EMAIL_RE, USERNAME_RE

from admin_app import create_app


def parse_args():
    parser = argparse.ArgumentParser(description='Seed a FleetAI superadmin account.')
    parser.add_argument('--username', default='superadmin')
    parser.add_argument('--email', default='superadmin@fleetai.com')
    parser.add_argument('--full-name', default='Platform Superadmin')
    parser.add_argument('--password', default=None, help='Omit to be prompted interactively.')
    return parser.parse_args()


def resolve_password(password):
    if password:
        return password
    if not sys.stdin.isatty():
        return 'admin123'
    while True:
        entered = getpass.getpass('Password (6-128 chars): ')
        if 6 <= len(entered) <= 128:
            return entered
        print('  Password must be between 6 and 128 characters.')


def main():
    args = parse_args()
    username = args.username.strip().lower()
    email = args.email.strip().lower()

    if not USERNAME_RE.fullmatch(username):
        print(f'Error: username "{username}" is invalid (letters/digits, 3-30 chars).')
        return 1
    if not EMAIL_RE.fullmatch(email):
        print(f'Error: email "{email}" is invalid.')
        return 1

    password = resolve_password(args.password)
    if not 6 <= len(password) <= 128:
        print('Error: password must be between 6 and 128 characters.')
        return 1

    app = create_app()
    with app.app_context():
        user = User.query.filter(
            (func.lower(User.username) == username) | (func.lower(User.email) == email)
        ).first()

        if user:
            user.role = 'superadmin'
            user.username = username
            user.email = email
            if args.full_name:
                user.full_name = args.full_name
            user.set_password(password)
            action = 'Updated'
        else:
            user = User(
                username=username,
                email=email,
                full_name=args.full_name,
                role='superadmin',
            )
            user.set_password(password)
            db.session.add(user)
            action = 'Created'

        db.session.commit()
        print(f'{action} superadmin account:')
        print(f'  Username: {user.username}')
        print(f'  Email:    {user.email}')
        print(f'  Role:     {user.role}')
        print('\nSign in at http://localhost:5175')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
