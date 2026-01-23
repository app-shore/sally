"""Prediction Engine for estimating post-load drive demand (stub for MVP)."""

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional

from app.utils.logger import get_logger
from app.utils.validators import validate_positive

logger = get_logger(__name__)


@dataclass
class PredictionInput:
    """Input data for drive demand prediction."""

    remaining_distance_miles: float
    destination: str
    appointment_time: Optional[datetime] = None
    current_location: Optional[str] = None
    average_speed_mph: float = 55.0  # Default average highway speed


@dataclass
class PredictionResult:
    """Drive demand prediction result."""

    estimated_drive_hours: float
    estimated_arrival_time: Optional[datetime]
    is_high_demand: bool
    is_low_demand: bool
    confidence: float  # 0-1 scale (stub for MVP)
    reasoning: str


class PredictionEngine:
    """
    Prediction Engine for estimating post-load drive demand.

    MVP Implementation: Simple time/distance calculation
    Future Enhancement: ML-based prediction with historical data, traffic, etc.
    """

    # Demand thresholds
    LOW_DEMAND_THRESHOLD_HOURS = 3.0
    HIGH_DEMAND_THRESHOLD_HOURS = 8.0

    def __init__(self) -> None:
        """Initialize Prediction Engine."""
        self.default_average_speed = 55.0  # mph

    def predict_drive_demand(self, input_data: PredictionInput) -> PredictionResult:
        """
        Predict post-load drive demand based on route information.

        Args:
            input_data: Prediction input data

        Returns:
            PredictionResult with estimated drive hours and demand classification

        Raises:
            ValueError: If input values are invalid
        """
        # Validate inputs
        try:
            validate_positive(input_data.remaining_distance_miles, "remaining_distance_miles")
            validate_positive(input_data.average_speed_mph, "average_speed_mph")
        except ValueError as e:
            logger.error("prediction_input_error", error=str(e))
            raise

        logger.info(
            "prediction_started",
            distance=input_data.remaining_distance_miles,
            destination=input_data.destination,
            avg_speed=input_data.average_speed_mph,
        )

        # Calculate estimated drive hours
        estimated_drive_hours = (
            input_data.remaining_distance_miles / input_data.average_speed_mph
        )

        # Estimate arrival time
        estimated_arrival_time = None
        if input_data.appointment_time:
            estimated_arrival_time = input_data.appointment_time
        else:
            # Simple calculation from now
            from datetime import timedelta

            now = datetime.now(timezone.utc)
            estimated_arrival_time = now + timedelta(hours=estimated_drive_hours)

        # Classify demand
        is_low_demand = estimated_drive_hours <= self.LOW_DEMAND_THRESHOLD_HOURS
        is_high_demand = estimated_drive_hours >= self.HIGH_DEMAND_THRESHOLD_HOURS

        # Generate reasoning
        reasoning = self._generate_reasoning(
            estimated_drive_hours,
            input_data.remaining_distance_miles,
            is_low_demand,
            is_high_demand,
        )

        # Confidence is 0.7 for MVP (simple calculation)
        # Future: ML model will provide actual confidence score
        confidence = 0.7

        result = PredictionResult(
            estimated_drive_hours=round(estimated_drive_hours, 2),
            estimated_arrival_time=estimated_arrival_time,
            is_high_demand=is_high_demand,
            is_low_demand=is_low_demand,
            confidence=confidence,
            reasoning=reasoning,
        )

        logger.info(
            "prediction_completed",
            estimated_hours=estimated_drive_hours,
            is_low_demand=is_low_demand,
            is_high_demand=is_high_demand,
        )

        return result

    def _generate_reasoning(
        self,
        estimated_hours: float,
        distance_miles: float,
        is_low_demand: bool,
        is_high_demand: bool,
    ) -> str:
        """Generate human-readable reasoning for the prediction."""
        base_text = (
            f"Estimated {estimated_hours:.1f} hours of driving "
            f"to cover {distance_miles:.1f} miles. "
        )

        if is_low_demand:
            return (
                base_text
                + f"This is considered LOW demand (< {self.LOW_DEMAND_THRESHOLD_HOURS}h), "
                "making it favorable for taking rest during dock time."
            )
        elif is_high_demand:
            return (
                base_text
                + f"This is considered HIGH demand (> {self.HIGH_DEMAND_THRESHOLD_HOURS}h), "
                "requiring careful rest planning to ensure sufficient hours available."
            )
        else:
            return (
                base_text
                + "This is considered MODERATE demand, "
                "requiring balanced rest and driving strategy."
            )

    def estimate_drive_hours_simple(self, distance_miles: float, avg_speed_mph: float = 55.0) -> float:
        """
        Simple helper method to estimate drive hours from distance.

        Args:
            distance_miles: Distance in miles
            avg_speed_mph: Average speed in mph

        Returns:
            float: Estimated drive hours
        """
        validate_positive(distance_miles, "distance_miles")
        validate_positive(avg_speed_mph, "avg_speed_mph")

        return distance_miles / avg_speed_mph

    # NEW METHODS FOR ROUTE PLANNING

    def estimate_dock_time(self, location_type: str) -> float:
        """
        Estimate dock time based on location type.

        MVP: Uses hardcoded defaults.
        Future: Use TMS historical data.

        Args:
            location_type: 'warehouse', 'customer', 'distribution_center', etc.

        Returns:
            Estimated dock time in hours
        """
        dock_times = {
            "warehouse": 2.0,
            "customer": 1.0,
            "distribution_center": 3.0,
            "truck_stop": 0.0,
            "service_area": 0.0,
            "fuel_station": 0.25,  # 15 minutes
        }

        return dock_times.get(location_type, 1.5)  # Default 1.5 hours

    def estimate_fuel_consumption(self, distance_miles: float, mpg: float = 6.0) -> float:
        """
        Estimate fuel consumption for a distance.

        Args:
            distance_miles: Distance in miles
            mpg: Miles per gallon (default 6.0 for trucks)

        Returns:
            Estimated gallons needed
        """
        validate_positive(distance_miles, "distance_miles")
        validate_positive(mpg, "mpg")

        return distance_miles / mpg
