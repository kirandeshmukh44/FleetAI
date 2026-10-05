from flask_jwt_extended import get_jwt_identity


def current_user_id():
    """Return the authenticated user's numeric id for workspace scoping."""
    try:
        return int(get_jwt_identity())
    except (TypeError, ValueError):
        return None