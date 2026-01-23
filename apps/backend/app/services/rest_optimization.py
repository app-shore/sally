"""Rest Optimization Engine for optimal rest timing recommendations.

This module implements an intelligent optimization formula that considers all HOS
parameters (drive limit, duty window, break requirements) and upcoming trip requirements
to make optimal rest recommendations.

See .specs/INTELLIGENT_OPTIMIZATION_FORMULA.md for detailed algorithm documentation.
"""

from dataclasses import dataclass
from typing import List, Optional

from app.config import settings
from app.core.constants import (
    LOW_DRIVE_DEMAND_THRESHOLD,
    MIN_DOCK_TIME_FOR_7H_SPLIT,
    MIN_DOCK_TIME_FOR_8H_SPLIT,
    MIN_DOCK_TIME_FOR_FULL_REST,
    MIN_DOCK_TIME_FOR_PARTIAL_REST,
    RestRecommendation,
    SLEEPER_BERTH_SPLIT_7_3_LONG,
    SLEEPER_BERTH_SPLIT_8_2_LONG,
)
from app.services.hos_rule_engine import HOSRuleEngine
from app.utils.logger import get_logger
from app.utils.validators import validate_positive

logger = get_logger(__name__)


@dataclass
class TripRequirement:
    """Single trip requirement."""

    drive_time: float  # Hours of driving needed
    dock_time: float  # Hours at dock (on-duty, not driving)
    location: Optional[str] = None  # Destination/dock location


@dataclass
class RestOptimizationInput:
    """Input data for rest optimization."""

    hours_driven: float
    on_duty_time: float
    hours_since_break: float
    dock_duration_hours: Optional[float]
    post_load_drive_hours: Optional[float]
    current_location: Optional[str] = None
    upcoming_trips: Optional[List[TripRequirement]] = None  # Multiple trips support


@dataclass
class FeasibilityAnalysis:
    """Trip feasibility analysis results."""

    feasible: bool
    limiting_factor: Optional[str]  # 'drive_limit', 'duty_window', or None
    shortfall_hours: float
    total_drive_needed: float
    total_on_duty_needed: float
    will_need_break: bool
    drive_margin: float
    duty_margin: float


@dataclass
class OpportunityAnalysis:
    """Rest opportunity scoring analysis."""

    score: float  # 0-100
    dock_score: float
    hours_score: float
    criticality_score: float
    dock_time_available: float
    hours_gainable: float


@dataclass
class CostAnalysis:
    """Rest extension cost analysis."""

    full_rest_extension_hours: float
    partial_rest_extension_hours: float
    dock_time_available: float


@dataclass
class RestOptimizationResult:
    """Rest optimization recommendation result with intelligent analysis."""

    recommendation: RestRecommendation
    recommended_duration_hours: Optional[float]
    reasoning: str
    confidence: int  # 0-100
    is_compliant: bool
    compliance_details: str
    hours_remaining_to_drive: float
    hours_remaining_on_duty: float
    post_load_drive_feasible: bool
    driver_can_decline: bool
    # Enhanced analytics
    feasibility_analysis: Optional[FeasibilityAnalysis] = None
    opportunity_analysis: Optional[OpportunityAnalysis] = None
    cost_analysis: Optional[CostAnalysis] = None
    # Before/after comparison
    hours_after_rest_drive: Optional[float] = None
    hours_after_rest_duty: Optional[float] = None


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
        self.sleeper_berth_split_short = settings.sleeper_berth_split_short
        self.max_drive_hours = settings.max_drive_hours
        self.max_duty_hours = settings.max_duty_hours
        self.break_trigger_hours = settings.break_trigger_hours
        self.required_break_minutes = settings.required_break_minutes

    def _calculate_feasibility(
        self, input_data: RestOptimizationInput
    ) -> FeasibilityAnalysis:
        """
        Calculate trip feasibility with current HOS status.

        Checks if driver can complete upcoming trips considering:
        - Drive hours remaining
        - Duty window remaining
        - Break requirements

        Returns FeasibilityAnalysis with limiting factors and margins.
        """
        # Build trip list
        if input_data.upcoming_trips:
            trips = input_data.upcoming_trips
        elif input_data.post_load_drive_hours is not None:
            # Backward compatibility: single trip from post_load_drive_hours
            trips = [
                TripRequirement(
                    drive_time=input_data.post_load_drive_hours,
                    dock_time=input_data.dock_duration_hours or 0,
                )
            ]
        else:
            # No trips specified - can't calculate feasibility
            return FeasibilityAnalysis(
                feasible=True,
                limiting_factor=None,
                shortfall_hours=0,
                total_drive_needed=0,
                total_on_duty_needed=0,
                will_need_break=False,
                drive_margin=999,  # Unknown
                duty_margin=999,
            )

        # Calculate total requirements
        total_drive_needed = sum(trip.drive_time for trip in trips)
        total_dock_needed = sum(trip.dock_time for trip in trips)
        total_on_duty_needed = total_drive_needed + total_dock_needed

        # Check if break will be required during trips
        will_need_break = (
            input_data.hours_since_break + total_drive_needed
        ) >= self.break_trigger_hours
        if will_need_break:
            # 30-min break counts as on-duty time
            total_on_duty_needed += self.required_break_minutes / 60.0

        # Calculate current hours remaining
        drive_remaining = self.max_drive_hours - input_data.hours_driven
        duty_remaining = self.max_duty_hours - input_data.on_duty_time

        # Calculate shortfalls
        drive_shortfall = max(0, total_drive_needed - drive_remaining)
        duty_shortfall = max(0, total_on_duty_needed - duty_remaining)

        # Determine feasibility and limiting factor
        if drive_shortfall > 0 or duty_shortfall > 0:
            limiting_factor = "drive_limit" if drive_shortfall >= duty_shortfall else "duty_window"
            shortfall_hours = max(drive_shortfall, duty_shortfall)
            feasible = False
        else:
            limiting_factor = None
            shortfall_hours = 0
            feasible = True

        return FeasibilityAnalysis(
            feasible=feasible,
            limiting_factor=limiting_factor,
            shortfall_hours=shortfall_hours,
            total_drive_needed=total_drive_needed,
            total_on_duty_needed=total_on_duty_needed,
            will_need_break=will_need_break,
            drive_margin=drive_remaining - total_drive_needed,
            duty_margin=duty_remaining - total_on_duty_needed,
        )

    def _calculate_rest_opportunity(
        self, input_data: RestOptimizationInput
    ) -> OpportunityAnalysis:
        """
        Calculate the opportunity value of taking rest at dock.

        Scoring factors (0-100 total):
        - Dock Time Availability: 0-30 points
        - Hours Gainable: 0-30 points
        - Current Hours Criticality: 0-40 points

        Returns OpportunityAnalysis with breakdown.
        """
        dock_time_available = input_data.dock_duration_hours or 0

        # Factor 1: Dock Time Availability (0-30 points)
        if dock_time_available >= self.min_rest_hours:
            dock_score = 30  # Perfect for full rest
        elif dock_time_available >= self.sleeper_berth_split_long:
            dock_score = 20  # Good for partial rest
        elif dock_time_available >= 2:
            dock_score = 10  # Marginal opportunity
        else:
            dock_score = 0  # Too short

        # Factor 2: Hours Gainable (0-30 points)
        if dock_time_available >= self.min_rest_hours or dock_time_available >= 2:
            drive_remaining = self.max_drive_hours - input_data.hours_driven
            duty_remaining = self.max_duty_hours - input_data.on_duty_time
            drive_gainable = self.max_drive_hours - drive_remaining
            duty_gainable = self.max_duty_hours - duty_remaining
            hours_gainable = max(drive_gainable, duty_gainable)

            # Normalize to 0-30 scale
            hours_score = min(30, (hours_gainable / self.max_drive_hours) * 30)
        else:
            hours_gainable = 0
            hours_score = 0

        # Factor 3: Current Hours Criticality (0-40 points)
        drive_utilization = input_data.hours_driven / self.max_drive_hours
        duty_utilization = input_data.on_duty_time / self.max_duty_hours
        max_utilization = max(drive_utilization, duty_utilization)

        if max_utilization >= 0.9:
            criticality_score = 40  # Critical
        elif max_utilization >= 0.75:
            criticality_score = 30  # High
        elif max_utilization >= 0.5:
            criticality_score = 15  # Moderate
        else:
            criticality_score = 5  # Low

        # Total opportunity score
        opportunity_score = dock_score + hours_score + criticality_score

        return OpportunityAnalysis(
            score=opportunity_score,
            dock_score=dock_score,
            hours_score=hours_score,
            criticality_score=criticality_score,
            dock_time_available=dock_time_available,
            hours_gainable=hours_gainable,
        )

    def _calculate_rest_cost(self, input_data: RestOptimizationInput) -> CostAnalysis:
        """
        Calculate the cost (additional time) needed to extend rest.

        Returns CostAnalysis with extension hours for full/partial rest.
        """
        dock_time_available = input_data.dock_duration_hours or 0

        # Cost for full rest (10 hours)
        if dock_time_available >= self.min_rest_hours:
            full_rest_extension = 0
        else:
            full_rest_extension = self.min_rest_hours - dock_time_available

        # Cost for partial rest (7 hours)
        if dock_time_available >= self.sleeper_berth_split_long:
            partial_rest_extension = 0
        else:
            partial_rest_extension = self.sleeper_berth_split_long - dock_time_available

        return CostAnalysis(
            full_rest_extension_hours=full_rest_extension,
            partial_rest_extension_hours=partial_rest_extension,
            dock_time_available=dock_time_available,
        )

    def _optimize_rest_decision(
        self,
        input_data: RestOptimizationInput,
        feasibility: FeasibilityAnalysis,
        opportunity: OpportunityAnalysis,
        cost: CostAnalysis,
    ) -> tuple[RestRecommendation, Optional[float], str, int, bool]:
        """
        Main optimization decision engine.

        Combines feasibility, opportunity, and cost to make intelligent recommendation.

        Returns: (recommendation, duration, reasoning, confidence, driver_can_decline)
        """
        # PRIORITY 1: MANDATORY REST (Compliance Issue)
        if not feasibility.feasible:
            if cost.dock_time_available >= 2:
                # Can leverage dock time
                return (
                    RestRecommendation.FULL_REST,
                    self.min_rest_hours,
                    f"Trip not feasible with current hours. "
                    f"Shortfall: {feasibility.shortfall_hours:.1f}h ({feasibility.limiting_factor}). "
                    f"Extending dock time ({cost.dock_time_available:.1f}h) to full {self.min_rest_hours:.0f}h rest "
                    f"will reset all hours and enable trip completion.",
                    100,  # Confidence
                    False,  # Cannot decline
                )
            else:
                # Dock time too short
                return (
                    RestRecommendation.FULL_REST,
                    self.min_rest_hours,
                    f"Trip not feasible. Must take full {self.min_rest_hours:.0f}h rest. "
                    f"Dock time ({cost.dock_time_available:.1f}h) too short to leverage.",
                    100,
                    False,
                )

        # PRIORITY 2: BREAK REQUIREMENT OVERRIDE
        if input_data.hours_since_break >= self.break_trigger_hours:
            return (
                RestRecommendation.NO_REST,  # Just a break, not full rest
                self.required_break_minutes / 60.0,
                f"30-minute break required (driven {input_data.hours_since_break:.1f}h without break). "
                f"Take off-duty break during dock time before continuing.",
                100,
                False,
            )

        # PRIORITY 3: FEASIBLE BUT MARGINAL (Risk Management)
        if feasibility.drive_margin < 2 or feasibility.duty_margin < 2:
            if opportunity.score >= 50 and cost.full_rest_extension_hours <= 5:
                # Good opportunity + reasonable cost
                return (
                    RestRecommendation.FULL_REST,
                    self.min_rest_hours,
                    f"Trip feasible but marginal (margin: {feasibility.drive_margin:.1f}h drive, "
                    f"{feasibility.duty_margin:.1f}h duty). "
                    f"Opportunity score: {opportunity.score:.0f}/100. "
                    f"Extending rest by {cost.full_rest_extension_hours:.1f}h provides "
                    f"{opportunity.hours_gainable:.1f}h gain and better safety margin.",
                    75,
                    True,
                )
            elif opportunity.score >= 40 and cost.partial_rest_extension_hours <= 3:
                # Moderate opportunity - determine best split type
                if cost.dock_time_available >= MIN_DOCK_TIME_FOR_8H_SPLIT:
                    return (
                        RestRecommendation.PARTIAL_REST_8_2,
                        SLEEPER_BERTH_SPLIT_8_2_LONG,
                        f"Trip marginal. Consider 8-hour partial rest (8/2 split). "
                        f"Extension needed: {max(0, SLEEPER_BERTH_SPLIT_8_2_LONG - cost.dock_time_available):.1f}h. "
                        f"Provides better recovery than 7/3 split while preserving schedule.",
                        65,
                        True,
                    )
                else:
                    return (
                        RestRecommendation.PARTIAL_REST_7_3,
                        SLEEPER_BERTH_SPLIT_7_3_LONG,
                        f"Trip marginal. Consider 7-hour partial rest (7/3 split). "
                        f"Extension needed: {cost.partial_rest_extension_hours:.1f}h. "
                        f"Provides some recovery while preserving schedule.",
                        65,
                        True,
                    )
            else:
                # Low opportunity - proceed with caution
                return (
                    RestRecommendation.NO_REST,
                    None,
                    f"Trip feasible but with tight margins (drive: {feasibility.drive_margin:.1f}h, "
                    f"duty: {feasibility.duty_margin:.1f}h). "
                    f"Monitor closely. Plan for rest after delivery.",
                    60,
                    True,
                )

        # PRIORITY 4: FEASIBLE WITH GOOD MARGIN (Optimization)
        if feasibility.drive_margin >= 2 and feasibility.duty_margin >= 2:
            if opportunity.score >= 60 and cost.full_rest_extension_hours <= 5:
                # High opportunity + low cost
                return (
                    RestRecommendation.FULL_REST,
                    self.min_rest_hours,
                    f"Trip easily feasible. However, dock time ({cost.dock_time_available:.1f}h) "
                    f"presents good rest opportunity (score: {opportunity.score:.0f}/100). "
                    f"Extending by {cost.full_rest_extension_hours:.1f}h would gain "
                    f"{opportunity.hours_gainable:.1f}h for next shift. Optional optimization.",
                    55,
                    True,
                )
            else:
                # No rest needed
                return (
                    RestRecommendation.NO_REST,
                    None,
                    f"Trip easily feasible with {feasibility.drive_margin:.1f}h drive margin "
                    f"and {feasibility.duty_margin:.1f}h duty margin. "
                    f"No rest needed. Continue as planned.",
                    80,
                    True,
                )

        # Fallback (should not reach here)
        return (
            RestRecommendation.NO_REST,
            None,
            "Continuing with current plan.",
            70,
            True,
        )

    def recommend_rest(self, input_data: RestOptimizationInput) -> RestOptimizationResult:
        """
        Generate intelligent rest recommendation using optimization formula.

        This method implements the intelligent optimization formula that considers:
        - All HOS compliance parameters (drive limit, duty window, break requirements)
        - Multiple upcoming trips (not just next stop)
        - Opportunity value of extending rest
        - Cost-benefit analysis

        Args:
            input_data: Rest optimization input data

        Returns:
            RestOptimizationResult with recommendation, confidence, and detailed analytics

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
            num_trips=len(input_data.upcoming_trips) if input_data.upcoming_trips else 0,
        )

        # Step 1: Check HOS compliance
        compliance_result = self.hos_engine.validate_compliance(
            hours_driven=input_data.hours_driven,
            on_duty_time=input_data.on_duty_time,
            hours_since_break=input_data.hours_since_break,
        )

        # Step 2: Run intelligent optimization formula
        feasibility = self._calculate_feasibility(input_data)
        opportunity = self._calculate_rest_opportunity(input_data)
        cost = self._calculate_rest_cost(input_data)

        recommendation, duration, reasoning, confidence, driver_can_decline = (
            self._optimize_rest_decision(input_data, feasibility, opportunity, cost)
        )

        # Step 3: Calculate hours after rest
        if recommendation == RestRecommendation.FULL_REST:
            hours_after_rest_drive = self.max_drive_hours
            hours_after_rest_duty = self.max_duty_hours
        elif recommendation in (RestRecommendation.PARTIAL_REST_7_3, RestRecommendation.PARTIAL_REST_8_2):
            # Partial rest (7/3 or 8/2 split) recovers some hours
            # Split sleeper berth provision: the long rest period does not count against 14-hour window
            # This is a simplification - real HOS is more complex
            hours_after_rest_drive = compliance_result.hours_remaining_to_drive + (
                duration or 0
            ) * 0.5
            hours_after_rest_duty = compliance_result.hours_remaining_on_duty + (
                duration or 0
            ) * 0.5
        else:
            hours_after_rest_drive = compliance_result.hours_remaining_to_drive
            hours_after_rest_duty = compliance_result.hours_remaining_on_duty

        # Step 4: Check if post-load drive is feasible
        post_load_feasible = feasibility.feasible or recommendation == RestRecommendation.FULL_REST

        # Compile compliance details
        compliance_details = "; ".join([check.message for check in compliance_result.checks])

        result = RestOptimizationResult(
            recommendation=recommendation,
            recommended_duration_hours=duration,
            reasoning=reasoning,
            confidence=confidence,
            is_compliant=compliance_result.is_compliant,
            compliance_details=compliance_details,
            hours_remaining_to_drive=compliance_result.hours_remaining_to_drive,
            hours_remaining_on_duty=compliance_result.hours_remaining_on_duty,
            post_load_drive_feasible=post_load_feasible,
            driver_can_decline=driver_can_decline,
            # Enhanced analytics
            feasibility_analysis=feasibility,
            opportunity_analysis=opportunity,
            cost_analysis=cost,
            hours_after_rest_drive=hours_after_rest_drive,
            hours_after_rest_duty=hours_after_rest_duty,
        )

        logger.info(
            "rest_optimization_completed",
            recommendation=recommendation.value,
            duration=duration,
            confidence=confidence,
            is_compliant=compliance_result.is_compliant,
            post_load_feasible=post_load_feasible,
            opportunity_score=opportunity.score,
            driver_can_decline=driver_can_decline,
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
                # Determine best split type based on dock time available
                if dock_duration >= MIN_DOCK_TIME_FOR_8H_SPLIT:
                    return (
                        RestRecommendation.PARTIAL_REST_8_2,
                        SLEEPER_BERTH_SPLIT_8_2_LONG,
                        f"Partial rest (8-hour 8/2 split) recommended. "
                        f"Dock time ({dock_duration:.1f}h) allows for 8/2 sleeper berth split, "
                        f"and remaining hours are moderate ({compliance_result.hours_remaining_to_drive:.1f}h). "
                        f"This provides good recovery while preserving schedule.",
                    )
                else:
                    return (
                        RestRecommendation.PARTIAL_REST_7_3,
                        SLEEPER_BERTH_SPLIT_7_3_LONG,
                        f"Partial rest (7-hour 7/3 split) recommended. "
                        f"Dock time ({dock_duration:.1f}h) allows for 7/3 sleeper berth split, "
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

        elif recommendation in (RestRecommendation.PARTIAL_REST_7_3, RestRecommendation.PARTIAL_REST_8_2):
            # After partial rest, some hours recovered (simplified)
            recovered_hours = duration or 0
            available_hours = compliance_result.hours_remaining_to_drive + (recovered_hours * 0.5)
            return post_load_drive <= available_hours

        else:  # NO_REST
            # Use current remaining hours
            return post_load_drive <= compliance_result.hours_remaining_to_drive
