"""Platform-wide analytics for the admin dashboard.

Unlike the main application (which scopes every query to ``user_id``), these
endpoints aggregate across the *entire* platform — that is the whole point of
an admin panel.
"""

from datetime import datetime, timedelta

from flask import Blueprint, jsonify
from sqlalchemy import func

from app.models import Driver, DriverBehavior, FuelRecord, Journey, RiskPrediction, User, Vehicle

from utils import admin_required, to_float

overview_bp = Blueprint('admin_overview', __name__)

VEHICLE_STATUSES = ('ACTIVE', 'IDLE', 'STOPPED', 'OFFLINE')
RISK_LEVELS = ('LOW', 'MEDIUM', 'HIGH')


def owner_label(user_id):
    user = User.query.get(user_id)
    return (user.full_name or user.username) if user else 'Unknown'


def since(days):
    return datetime.utcnow() - timedelta(days=days)


@overview_bp.route('/stats', methods=['GET'])
@admin_required
def platform_stats():
    """Headline KPIs + status/risk distributions in a single round trip."""
    vehicle_status = {
        status: Vehicle.query.filter_by(status=status).count() for status in VEHICLE_STATUSES
    }
    driver_risk = {level: Driver.query.filter_by(risk_level=level).count() for level in RISK_LEVELS}

    total_vehicles = Vehicle.query.count()
    total_drivers = Driver.query.count()
    total_journeys = Journey.query.count()
    active_vehicles = vehicle_status.get('ACTIVE', 0)

    efficiencies = [
        to_float(row[0])
        for row in FuelRecord.query.with_entities(FuelRecord.fuel_efficiency).all()
    ]
    efficiencies = [value for value in efficiencies if value > 0]
    avg_efficiency = round(sum(efficiencies) / len(efficiencies), 2) if efficiencies else 0.0

    total_cost = to_float(FuelRecord.query.with_entities(func.sum(FuelRecord.cost)).scalar())
    total_distance = to_float(Journey.query.with_entities(func.sum(Journey.distance)).scalar())
    last_7 = since(7)

    utilization = round((active_vehicles / total_vehicles) * 100, 1) if total_vehicles else 0.0

    return jsonify({
        'kpis': {
            'total_users': User.query.count(),
            'total_vehicles': total_vehicles,
            'active_vehicles': active_vehicles,
            'total_drivers': total_drivers,
            'total_journeys': total_journeys,
            'high_risk_drivers': driver_risk.get('HIGH', 0),
            'high_risk_predictions': RiskPrediction.query.filter_by(risk_level='HIGH').count(),
            'avg_fuel_efficiency': avg_efficiency,
            'total_fuel_cost': round(total_cost, 2),
            'total_distance_km': round(total_distance, 1),
            'fleet_utilization': utilization,
        },
        'vehicle_status': vehicle_status,
        'driver_risk': driver_risk,
        'recent_7_days': {
            'new_users': User.query.filter(User.created_at >= last_7).count(),
            'new_vehicles': Vehicle.query.filter(Vehicle.created_at >= last_7).count(),
            'new_drivers': Driver.query.filter(Driver.created_at >= last_7).count(),
            'new_journeys': Journey.query.filter(Journey.created_at >= last_7).count(),
        },
    }), 200


@overview_bp.route('/trends', methods=['GET'])
@admin_required
def platform_trends():
    """Daily time series for the last 30 days, merged onto a single date axis."""
    window = since(30)

    def series(model, column):
        rows = (
            model.query.with_entities(
                func.date(column).label('day'),
                func.count(model.id).label('count'),
            )
            .filter(column >= window)
            .group_by(func.date(column))
            .order_by(func.date(column))
            .all()
        )
        return {str(row[0]): row[1] for row in rows}

    index = {
        'journeys': series(Journey, Journey.created_at),
        'drivers': series(Driver, Driver.created_at),
        'vehicles': series(Vehicle, Vehicle.created_at),
    }
    days = sorted({day for bucket in index.values() for day in bucket})
    trends = [
        {'date': day, **{key: bucket.get(day, 0) for key, bucket in index.items()}} for day in days
    ]

    return jsonify({'trends': trends, 'window_days': 30}), 200


@overview_bp.route('/top-vehicles', methods=['GET'])
@admin_required
def top_vehicles():
    """Highest-mileage vehicles, for the admin overview leaderboard."""
    rows = (
        Journey.query.with_entities(
            Journey.vehicle_id,
            func.count(Journey.id).label('journeys'),
            func.sum(Journey.distance).label('distance'),
            func.sum(Journey.fuel_consumed).label('fuel'),
        )
        .group_by(Journey.vehicle_id)
        .order_by(func.sum(Journey.distance).desc())
        .limit(8)
        .all()
    )

    result = []
    for vehicle_id, journeys, distance, fuel in rows:
        vehicle = Vehicle.query.get(vehicle_id)
        if not vehicle:
            continue
        distance_value = to_float(distance)
        fuel_value = to_float(fuel)
        result.append({
            'vehicle_id': vehicle.id,
            'code': vehicle.vehicle_id,
            'registration_number': vehicle.registration_number,
            'vehicle_type': vehicle.vehicle_type,
            'status': vehicle.status,
            'owner': owner_label(vehicle.user_id),
            'journeys': journeys,
            'distance_km': round(distance_value, 1),
            'fuel_liters': round(fuel_value, 1),
            'efficiency': round(distance_value / fuel_value, 2) if fuel_value > 0 else 0.0,
        })
    return jsonify(result), 200


@overview_bp.route('/risk-breakdown', methods=['GET'])
@admin_required
def risk_breakdown():
    """Recent ML predictions grouped by risk level and model used."""
    by_level = {
        level: RiskPrediction.query.filter_by(risk_level=level).count() for level in RISK_LEVELS
    }
    rows = (
        RiskPrediction.query.with_entities(
            RiskPrediction.model_used, func.count(RiskPrediction.id)
        )
        .group_by(RiskPrediction.model_used)
        .all()
    )
    return jsonify({
        'by_level': by_level,
        'by_model': [{'model_used': row[0] or 'unknown', 'count': row[1]} for row in rows],
        'behavior_events': {
            'harsh_braking': DriverBehavior.query.filter(DriverBehavior.harsh_braking.is_(True)).count(),
            'harsh_acceleration': DriverBehavior.query.filter(
                DriverBehavior.harsh_acceleration.is_(True)
            ).count(),
            'speeding': DriverBehavior.query.filter(DriverBehavior.speeding.is_(True)).count(),
        },
    }), 200

