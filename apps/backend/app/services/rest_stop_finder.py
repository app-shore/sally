"""Rest Stop Finder for locating truck stops along route.

Finds suitable rest locations (truck stops, service areas) near a given point or along a route.
"""

import logging
from dataclasses import dataclass
from typing import List

logger = logging.getLogger(__name__)


@dataclass
class RestStopLocation:
    """Represents a rest stop location."""

    stop_id: str
    name: str
    lat: float
    lon: float
    location_type: str  # truck_stop, service_area
    amenities: List[str]  # ["parking", "fuel", "food", "showers"]
    distance_from_point: float  # Miles from reference point


class RestStopFinder:
    """
    Service for finding rest stops along routes.

    MVP: Uses hardcoded database of major truck stops.
    Future: Integrate with truck stop APIs (Pilot Flying J, Love's, TA/Petro).
    """

    def __init__(self):
        """Initialize with hardcoded truck stop database."""
        # MVP: Hardcoded major truck stops (simplified)
        # In production, this would come from database or API
        self.truck_stops_db = self._load_truck_stops_database()

    def _load_truck_stops_database(self) -> List[dict]:
        """
        Load truck stop database.

        MVP: Returns hardcoded sample data.
        Future: Load from database or external API.
        """
        # Sample truck stops across major interstates
        return [
            {
                "stop_id": "ts_i80_exit_123",
                "name": "Pilot Travel Center - I-80 Exit 123",
                "lat": 41.2565,
                "lon": -95.9345,
                "location_type": "truck_stop",
                "amenities": ["parking", "fuel", "food", "showers", "laundry"],
            },
            {
                "stop_id": "ts_i80_exit_145",
                "name": "Love's Travel Stop - I-80 Exit 145",
                "lat": 41.1234,
                "lon": -96.1234,
                "location_type": "truck_stop",
                "amenities": ["parking", "fuel", "food"],
            },
            {
                "stop_id": "ts_i5_exit_200",
                "name": "TA Travel Center - I-5 Exit 200",
                "lat": 34.0522,
                "lon": -118.2437,
                "location_type": "truck_stop",
                "amenities": ["parking", "fuel", "food", "showers", "truck_wash"],
            },
            {
                "stop_id": "ts_i95_exit_50",
                "name": "Petro Stopping Center - I-95 Exit 50",
                "lat": 39.7392,
                "lon": -104.9903,
                "location_type": "truck_stop",
                "amenities": ["parking", "fuel", "food", "showers"],
            },
            {
                "stop_id": "ts_i40_exit_100",
                "name": "Flying J - I-40 Exit 100",
                "lat": 35.4676,
                "lon": -97.5164,
                "location_type": "truck_stop",
                "amenities": ["parking", "fuel", "food", "showers", "wifi"],
            },
        ]

    def find_rest_stops_near_point(
        self, lat: float, lon: float, radius_miles: float = 50
    ) -> List[RestStopLocation]:
        """
        Find rest stops within radius of a point.

        Args:
            lat: Latitude of reference point
            lon: Longitude of reference point
            radius_miles: Search radius in miles

        Returns:
            List of RestStopLocation objects within radius
        """
        from app.utils.distance_calculator import haversine_distance

        nearby_stops = []

        for stop in self.truck_stops_db:
            distance = haversine_distance(lat, lon, stop["lat"], stop["lon"])

            if distance <= radius_miles:
                nearby_stops.append(
                    RestStopLocation(
                        stop_id=stop["stop_id"],
                        name=stop["name"],
                        lat=stop["lat"],
                        lon=stop["lon"],
                        location_type=stop["location_type"],
                        amenities=stop["amenities"],
                        distance_from_point=distance,
                    )
                )

        # Sort by distance
        nearby_stops.sort(key=lambda x: x.distance_from_point)

        logger.info(
            f"Found {len(nearby_stops)} rest stops within {radius_miles} miles "
            f"of ({lat:.4f}, {lon:.4f})"
        )

        return nearby_stops

    def find_rest_stop_along_route(
        self, from_lat: float, from_lon: float, to_lat: float, to_lon: float
    ) -> RestStopLocation | None:
        """
        Find a rest stop along a route segment.

        Looks for stops within 25 miles of the midpoint of the route segment.

        Args:
            from_lat, from_lon: Start point
            to_lat, to_lon: End point

        Returns:
            RestStopLocation or None if no suitable stop found
        """
        # Calculate midpoint
        mid_lat = (from_lat + to_lat) / 2
        mid_lon = (from_lon + to_lon) / 2

        # Find stops near midpoint
        nearby_stops = self.find_rest_stops_near_point(mid_lat, mid_lon, radius_miles=25)

        if nearby_stops:
            # Return closest stop
            return nearby_stops[0]

        logger.warning(
            f"No rest stops found along route from ({from_lat:.4f}, {from_lon:.4f}) "
            f"to ({to_lat:.4f}, {to_lon:.4f})"
        )
        return None

    def get_rest_stop_by_id(self, stop_id: str) -> RestStopLocation | None:
        """Get rest stop details by ID."""
        for stop in self.truck_stops_db:
            if stop["stop_id"] == stop_id:
                return RestStopLocation(
                    stop_id=stop["stop_id"],
                    name=stop["name"],
                    lat=stop["lat"],
                    lon=stop["lon"],
                    location_type=stop["location_type"],
                    amenities=stop["amenities"],
                    distance_from_point=0.0,
                )
        return None
