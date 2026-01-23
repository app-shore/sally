"""Distance calculation utilities for route planning.

MVP: Uses Haversine formula for straight-line distances.
Future: Integrate with Google Maps Directions API or OpenStreetMap routing.
"""

import logging
import math
from typing import Dict, List, Tuple

logger = logging.getLogger(__name__)


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate great-circle distance between two points using Haversine formula.

    Args:
        lat1, lon1: First point coordinates (degrees)
        lat2, lon2: Second point coordinates (degrees)

    Returns:
        Distance in miles
    """
    # Earth radius in miles
    R = 3959.0

    # Convert to radians
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)

    # Haversine formula
    a = (
        math.sin(delta_lat / 2) ** 2
        + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon / 2) ** 2
    )
    c = 2 * math.asin(math.sqrt(a))

    distance = R * c
    return distance


def calculate_distance_matrix(
    stops: List[Dict[str, any]]
) -> Dict[Tuple[str, str], float]:
    """
    Calculate N x N distance matrix for all stops.

    MVP: Uses Haversine (straight-line) distances.
    Future: Use routing API for actual road distances.

    Args:
        stops: List of stop dicts with keys: stop_id, lat, lon

    Returns:
        Dictionary mapping (stop_id_1, stop_id_2) -> distance_miles
    """
    distance_matrix = {}

    for i, stop1 in enumerate(stops):
        for j, stop2 in enumerate(stops):
            if i == j:
                # Same stop
                distance_matrix[(stop1["stop_id"], stop2["stop_id"])] = 0.0
            else:
                # Calculate distance
                distance = haversine_distance(
                    stop1["lat"], stop1["lon"], stop2["lat"], stop2["lon"]
                )

                # Apply road factor (straight-line * 1.2 for road routing approximation)
                distance_with_road_factor = distance * 1.2

                distance_matrix[(stop1["stop_id"], stop2["stop_id"])] = (
                    distance_with_road_factor
                )

    logger.info(f"Calculated distance matrix for {len(stops)} stops")
    return distance_matrix


def estimate_drive_time(distance_miles: float, road_type: str = "highway") -> float:
    """
    Estimate drive time based on distance and road type.

    MVP: Uses hardcoded average speeds.
    Future: Integrate live traffic data.

    Args:
        distance_miles: Distance in miles
        road_type: 'interstate', 'highway', or 'city'

    Returns:
        Drive time in hours
    """
    # Average speeds by road type (mph)
    speeds = {"interstate": 60, "highway": 50, "city": 30}

    avg_speed = speeds.get(road_type, 55)  # Default to 55 mph

    drive_time_hours = distance_miles / avg_speed
    return drive_time_hours


def get_data_source_label() -> str:
    """
    Return data source label for UI display.

    Returns:
        Data source description
    """
    return "Static Haversine Distance (Future: Google Maps API)"
