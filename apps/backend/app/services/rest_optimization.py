"""Rest Optimization Engine for optimal rest timing recommendations."""

from dataclasses import dataclass
from typing import Optional

from app.config import settings
from app.core.constants import (
    LOW_DRIVE_DEMAND_THRESHOLD,
    MIN_DOCK_TIME_FOR_FULL_REST,
    MIN_DOCK_TIME_FOR_PARTIAL_REST,
    RestRecommendation,
)
from app.services.hos_rule_engine import HOSRuleEngine
from app.utils.logger import get_logger
from app.utils.validators import validate_positive

logger = get_logger(__name__)


@dataclass
class RestOptimizationInput:
    """Input data for rest optimization."""

    hours_driven: float
    on_duty_time: float
    hours_since_break: float
    dock_duration_hours: Optional[float]
    post_load_drive_hours: Optional[float]
    current_location: Optional[str] = None


@dataclass
class RestOptimizationResult:
    """Rest optimization recommendation result."""

    recommendation: RestRecommendation
    recommended_duration_hours: Optional[float]
    reasoning: str
    is_compliant: bool
    compliance_details: str
    hours_remaining_to_drive: float
    hours_remaining_on_duty: float
    post_load_drive_feasible: bool


class RestOptimizationEngine:
    """
    Rest Optimization Engine for recommending optimal rest timing.

    Analyzes dock time, HOS status, and post-load drive demand to recommend:
    - FULL_REST: Take complete 10-hour sleeper berth rest
    - PARTIAL_REST: Take split sleeper berth rest (7-8 hours)
    - NO_REST: Continue without rest
    """

    def __init__(self) -> None:
        """Initialize Rest Optimization Engine."""
        self.hos_engine = HOSRuleEngine()
        self.min_rest_hours = settings.min_rest_hours
        self.sleeper_berth_split_long = settings.sleeper_berth_split_long

    def recommend_rest(self, input_data: RestOptimizationInput) -> RestOptimizationResult:
        """
        Generate rest recommendation based on current HOS status and route data.

        Args:
            input_data: Rest optimization input data

        Returns:
            RestOptimizationResult with recommendation and reasoning

        Raises:
            ValueError: If input values are invalid
        """
        # Validate inputs
        try:
            validate_positive(input_data.hours_driven, "hours_driven")
            validate_positive(input_data.on_duty_time, "on_duty_time")
            validate_positive(input_data.hours_since_break, "hours_since_break")
            if input_data.dock_duration_hours is not None:
                validate_positive(input_data.dock_duration_hours, "dock_duration_hours")
            if input_data.post_load_drive_hours is not None:
                validate_positive(input_data.post_load_drive_hours, "post_load_drive_hours")
        except ValueError as e:
            logger.error("rest_optimization_input_error", error=str(e))
            raise

        logger.info(
            "rest_optimization_started",
            hours_driven=input_data.hours_driven,
            on_duty_time=input_data.on_duty_time,
            dock_duration=input_data.dock_duration_hours,
            post_load_drive=input_data.post_load_drive_hours,
        )

        # Step 1: Check HOS compliance
        compliance_result = self.hos_engine.validate_compliance(
            hours_driven=input_data.hours_driven,
            on_duty_time=input_data.on_duty_time,
            hours_since_break=input_data.hours_since_break,
        )

        # Step 2: Determine rest recommendation
        recommendation, duration, reasoning = self._calculate_recommendation(
            input_data, compliance_result
        )

        # Step 3: Check if post-load drive is feasible
        post_load_feasible = self._check_post_load_feasibility(
            input_data, compliance_result, recommendation, duration
        )

        # Compile compliance details
        compliance_details = "; ".join([check.message for check in compliance_result.checks])

        result = RestOptimizationResult(
            recommendation=recommendation,
            recommended_duration_hours=duration,
            reasoning=reasoning,
            is_compliant=compliance_result.is_compliant,
            compliance_details=compliance_details,
            hours_remaining_to_drive=compliance_result.hours_remaining_to_drive,
            hours_remaining_on_duty=compliance_result.hours_remaining_on_duty,
            post_load_drive_feasible=post_load_feasible,
        )

        logger.info(
            "rest_optimization_completed",
            recommendation=recommendation.value,
            duration=duration,
            is_compliant=compliance_result.is_compliant,
            post_load_feasible=post_load_feasible,
        )

        return result

    def _calculate_recommendation(
        self,
        input_data: RestOptimizationInput,
        compliance_result,
    ) -> tuple[RestRecommendation, Optional[float], str]:
        """Calculate the rest recommendation based on inputs and compliance."""
        # If already non-compliant or rest is required
        if compliance_result.rest_required or not compliance_result.is_compliant:
            return (
                RestRecommendation.FULL_REST,
                self.min_rest_hours,
                "Full 10-hour rest required due to HOS limits reached. "
                "Must take minimum rest period to reset hours.",
            )

        # If no dock time provided, can't make dock-based recommendation
        if input_data.dock_duration_hours is None:
            if compliance_result.hours_remaining_to_drive < 3.0:
                return (
                    RestRecommendation.FULL_REST,
                    self.min_rest_hours,
                    f"Recommended full rest due to limited remaining hours "
                    f"({compliance_result.hours_remaining_to_drive:.1f}h remaining). "
                    f"Taking rest now will maximize available driving hours.",
                )
            else:
                return (
                    RestRecommendation.NO_REST,
                    None,
                    f"No rest recommended. Sufficient hours remaining "
                    f"({compliance_result.hours_remaining_to_drive:.1f}h to drive, "
                    f"{compliance_result.hours_remaining_on_duty:.1f}h on-duty).",
                )

        dock_duration = input_data.dock_duration_hours
        post_load_drive = input_data.post_load_drive_hours or 0.0

        # Scenario 1: Dock time sufficient for full rest AND low post-load demand
        if (
            dock_duration >= MIN_DOCK_TIME_FOR_FULL_REST
            and post_load_drive <= LOW_DRIVE_DEMAND_THRESHOLD
        ):
            return (
                RestRecommendation.FULL_REST,
                self.min_rest_hours,
                f"Full 10-hour rest recommended. Dock time ({dock_duration:.1f}h) "
                f"is sufficient and post-load drive demand is low ({post_load_drive:.1f}h). "
                f"This maximizes productive driving hours for next shift.",
            )

        # Scenario 2: Dock time sufficient for partial rest
        if dock_duration >= MIN_DOCK_TIME_FOR_PARTIAL_REST:
            if compliance_result.hours_remaining_to_drive < 4.0:
                return (
                    RestRecommendation.PARTIAL_REST,
                    self.sleeper_berth_split_long,
                    f"Partial rest ({self.sleeper_berth_split_long:.0f}-hour split) recommended. "
                    f"Dock time ({dock_duration:.1f}h) allows for sleeper berth split, "
                    f"and remaining hours are moderate ({compliance_result.hours_remaining_to_drive:.1f}h). "
                    f"This provides some recovery while preserving schedule.",
                )
            else:
                return (
                    RestRecommendation.NO_REST,
                    None,
                    f"No rest recommended. Sufficient hours remaining "
                    f"({compliance_result.hours_remaining_to_drive:.1f}h to drive). "
                    f"Dock time ({dock_duration:.1f}h) could allow rest, but not needed at this time.",
                )

        # Scenario 3: Dock time insufficient for meaningful rest
        if compliance_result.hours_remaining_to_drive < 2.0:
            return (
                RestRecommendation.FULL_REST,
                self.min_rest_hours,
                f"Full rest recommended despite short dock time ({dock_duration:.1f}h). "
                f"Very limited hours remaining ({compliance_result.hours_remaining_to_drive:.1f}h). "
                f"Rest should be taken as soon as possible.",
            )
        else:
            return (
                RestRecommendation.NO_REST,
                None,
                f"No rest recommended. Dock time ({dock_duration:.1f}h) is too short "
                f"for effective rest, and sufficient hours remain "
                f"({compliance_result.hours_remaining_to_drive:.1f}h to drive).",
            )

    def _check_post_load_feasibility(
        self,
        input_data: RestOptimizationInput,
        compliance_result,
        recommendation: RestRecommendation,
        duration: Optional[float],
    ) -> bool:
        """Check if post-load drive is feasible after recommended rest."""
        if input_data.post_load_drive_hours is None:
            return True  # Unknown, assume feasible

        post_load_drive = input_data.post_load_drive_hours

        if recommendation == RestRecommendation.FULL_REST:
            # After full rest, driver gets full hours back
            return post_load_drive <= settings.max_drive_hours

        elif recommendation == RestRecommendation.PARTIAL_REST:
            # After partial rest, some hours recovered (simplified)
            recovered_hours = duration or 0
            available_hours = compliance_result.hours_remaining_to_drive + (recovered_hours * 0.5)
            return post_load_drive <= available_hours

        else:  # NO_REST
            # Use current remaining hours
            return post_load_drive <= compliance_result.hours_remaining_to_drive
