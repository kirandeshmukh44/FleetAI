import re
from datetime import date

EMAIL_RE = re.compile(r'^[^\s@]+@[^\s@]+\.[^\s@]{2,}$')
USERNAME_RE = re.compile(r'^[A-Za-z][A-Za-z0-9_.-]{2,29}$')
VEHICLE_ID_RE = re.compile(r'^VH-\d{3}$')
DRIVER_ID_RE = re.compile(r'^DR-\d{3}$')
JOURNEY_ID_RE = re.compile(r'^JR-\d{3}$')
REGISTRATION_RE = re.compile(r'^[A-Z]{2}[- ]?\d{1,2}[- ]?[A-Z]{1,3}[- ]?\d{4}$')
PHONE_RE = re.compile(r'^(?:[6-9]\d{9}|\+91\s?[6-9]\d{9})$')
NAME_RE = re.compile(r"^[A-Za-z][A-Za-z .'-]{1,99}$")


def clean(value):
    return str(value or '').strip()


def valid_email(value):
    return bool(EMAIL_RE.fullmatch(clean(value)))


def valid_date(value):
    try:
        date.fromisoformat(clean(value))
        return True
    except (TypeError, ValueError):
        return False
