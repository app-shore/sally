"""Data source labeling utilities for route planning.

Labels all data sources with current implementation and future integration plans.
"""

from enum import Enum


class DataSource(str, Enum):
    """Data source types for route planning."""

    # Distance & Routing
    DISTANCE_STATIC = "distance_static"
    DISTANCE_LIVE = "distance_live"

    # Traffic
    TRAFFIC_NONE = "traffic_none"
    TRAFFIC_LIVE = "traffic_live"

    # Dock Times
    DOCK_TIME_ESTIMATE = "dock_time_estimate"
    DOCK_TIME_HISTORICAL = "dock_time_historical"
    DOCK_TIME_MANUAL = "dock_time_manual"

    # HOS Data
    HOS_MANUAL = "hos_manual"
    HOS_ELD_API = "hos_eld_api"

    # Fuel Data
    FUEL_MANUAL = "fuel_manual"
    FUEL_TELEMATICS = "fuel_telematics"

    # Fuel Prices
    FUEL_PRICE_MANUAL = "fuel_price_manual"
    FUEL_PRICE_API = "fuel_price_api"

    # Weather
    WEATHER_NONE = "weather_none"
    WEATHER_API = "weather_api"

    # Stop Data
    STOP_MANUAL = "stop_manual"
    STOP_TMS = "stop_tms"


# Data source labels for UI display
DATA_SOURCE_LABELS = {
    # Distance
    DataSource.DISTANCE_STATIC: {
        "current": "Static Haversine Distance",
        "future": "Google Maps Directions API",
        "badge_color": "gray",
    },
    DataSource.DISTANCE_LIVE: {
        "current": "Google Maps Directions API",
        "future": None,
        "badge_color": "green",
    },
    # Traffic
    DataSource.TRAFFIC_NONE: {
        "current": "No Traffic Data",
        "future": "Google Maps Traffic API",
        "badge_color": "gray",
    },
    DataSource.TRAFFIC_LIVE: {
        "current": "Live Traffic API",
        "future": None,
        "badge_color": "green",
    },
    # Dock Times
    DataSource.DOCK_TIME_ESTIMATE: {
        "current": "Default Estimate",
        "future": "TMS Historical Data",
        "badge_color": "gray",
    },
    DataSource.DOCK_TIME_HISTORICAL: {
        "current": "TMS Historical Data",
        "future": None,
        "badge_color": "green",
    },
    DataSource.DOCK_TIME_MANUAL: {
        "current": "Manual Entry",
        "future": "TMS Integration",
        "badge_color": "gray",
    },
    # HOS
    DataSource.HOS_MANUAL: {
        "current": "Manual Entry",
        "future": "ELD API (Samsara, KeepTruckin)",
        "badge_color": "gray",
    },
    DataSource.HOS_ELD_API: {
        "current": "ELD API",
        "future": None,
        "badge_color": "green",
    },
    # Fuel
    DataSource.FUEL_MANUAL: {
        "current": "Manual Entry",
        "future": "Telematics API",
        "badge_color": "gray",
    },
    DataSource.FUEL_TELEMATICS: {
        "current": "Telematics API",
        "future": None,
        "badge_color": "green",
    },
    # Fuel Prices
    DataSource.FUEL_PRICE_MANUAL: {
        "current": "Manual Entry (Updated Weekly)",
        "future": "GasBuddy API",
        "badge_color": "gray",
    },
    DataSource.FUEL_PRICE_API: {
        "current": "GasBuddy API",
        "future": None,
        "badge_color": "green",
    },
    # Weather
    DataSource.WEATHER_NONE: {
        "current": "No Weather Data",
        "future": "OpenWeatherMap API",
        "badge_color": "gray",
    },
    DataSource.WEATHER_API: {
        "current": "OpenWeatherMap API",
        "future": None,
        "badge_color": "green",
    },
    # Stops
    DataSource.STOP_MANUAL: {
        "current": "Manual Entry",
        "future": "TMS API",
        "badge_color": "gray",
    },
    DataSource.STOP_TMS: {"current": "TMS API", "future": None, "badge_color": "green"},
}


def get_data_source_info(source: DataSource) -> dict:
    """
    Get data source information for UI display.

    Args:
        source: DataSource enum value

    Returns:
        Dictionary with keys: current, future, badge_color
    """
    return DATA_SOURCE_LABELS.get(
        source,
        {"current": "Unknown", "future": None, "badge_color": "gray"},
    )


def format_data_source_badge(source: DataSource) -> dict:
    """
    Format data source as badge for API response.

    Args:
        source: DataSource enum value

    Returns:
        Dictionary for frontend badge rendering
    """
    info = get_data_source_info(source)

    badge = {
        "label": info["current"],
        "color": info["badge_color"],
        "tooltip": f"Future: {info['future']}" if info["future"] else "Live data source",
    }

    return badge


# Default data sources for MVP
DEFAULT_MVP_SOURCES = {
    "distance": DataSource.DISTANCE_STATIC,
    "traffic": DataSource.TRAFFIC_NONE,
    "dock_time": DataSource.DOCK_TIME_ESTIMATE,
    "hos": DataSource.HOS_MANUAL,
    "fuel_level": DataSource.FUEL_MANUAL,
    "fuel_price": DataSource.FUEL_PRICE_MANUAL,
    "weather": DataSource.WEATHER_NONE,
    "stops": DataSource.STOP_MANUAL,
}
