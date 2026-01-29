"""Dynamic Update Handler for route monitoring and re-planning.

Monitors route execution and triggers re-plans when conditions change.
Implements 14 trigger types across 5 categories.
"""

import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import List, Optional

from app.services.hos_rule_engine import HOSRuleEngine, HOSState
from app.services.route_planning_engine import RoutePlanInput, RoutePlanningEngine

logger = logging.getLogger(__name__)


@dataclass
class UpdateTrigger:
    """Represents a trigger that requires evaluation."""

    trigger_type: str
    priority: str  # CRITICAL, HIGH, MEDIUM, LOW
    trigger_data: dict
    action: str  # MANDATORY_REST, INSERT_REST, ADJUST_ROUTE, UPDATE_ETAS, etc.
    reason: str


@dataclass
class ReplanDecision:
    """Decision on whether to replan."""

    replan_triggered: bool
    action: str
    reason: str
    priority: str
    trigger_type: str


class DynamicUpdateHandler:
    """
    Continuous monitoring service for active routes.

    Detects 14 trigger types across 5 categories:
    1. External Events (4 triggers)
    2. HOS Compliance (3 triggers)
    3. Vehicle/Operational (3 triggers)
    4. Appointment/Customer (2 triggers)
    5. Environmental (2 triggers - Phase 2)
    """

    # Thresholds
    TRAFFIC_DELAY_THRESHOLD_MIN = 30  # Minutes
    DOCK_TIME_VARIANCE_THRESHOLD_HOURS = 1  # Hours
    SPEED_DEVIATION_THRESHOLD_PCT = 0.15  # 15%
    FUEL_LOW_THRESHOLD = 0.25  # 25% of capacity
    HOS_WARNING_THRESHOLD_HOURS = 2  # Warn 2h before limit

    def __init__(self):
        """Initialize update handler."""
        self.hos_engine = HOSRuleEngine()
        self.route_planner = RoutePlanningEngine()

    # ==========================================================================
    # CATEGORY 1: EXTERNAL EVENTS (4 triggers)
    # ==========================================================================

    def check_traffic_updates(self, plan_id: str, current_segment_id: str) -> Optional[UpdateTrigger]:
        """
        Trigger 1: Traffic Delays / Road Closures.

        MVP: Manual report (no live API).
        Future: Traffic API integration.
        """
        # TODO: Integrate with Traffic API in Phase 2
        # For MVP, this would be triggered by manual input

        # Placeholder: Check if traffic report exists for current segment
        traffic_delay_minutes = 0  # Would come from API or manual report

        if traffic_delay_minutes >= self.TRAFFIC_DELAY_THRESHOLD_MIN:
            priority = "HIGH" if traffic_delay_minutes > 60 else "MEDIUM"
            action = "ADJUST_ROUTE_OR_INSERT_REST" if traffic_delay_minutes > 60 else "UPDATE_ETAS"

            return UpdateTrigger(
                trigger_type="traffic_delay",
                priority=priority,
                trigger_data={
                    "segment_id": current_segment_id,
                    "delay_minutes": traffic_delay_minutes,
                },
                action=action,
                reason=f"Traffic delay of {traffic_delay_minutes} minutes detected",
            )

        return None

    def check_dock_time_changes(
        self, plan_id: str, segment_id: str, estimated_dock_hours: float, actual_dock_hours: float
    ) -> Optional[UpdateTrigger]:
        """
        Trigger 2: Dock Time Changes (Early/Late Loading).

        Triggered when driver reports actual dock time differs from estimate.
        """
        variance = abs(actual_dock_hours - estimated_dock_hours)

        if variance >= self.DOCK_TIME_VARIANCE_THRESHOLD_HOURS:
            # Check HOS impact
            # TODO: Get driver HOS state and check remaining route feasibility

            priority = "CRITICAL"  # Assume critical for now
            action = "INSERT_REST_OR_SKIP_STOPS"

            return UpdateTrigger(
                trigger_type="dock_time_change",
                priority=priority,
                trigger_data={
                    "segment_id": segment_id,
                    "estimated_hours": estimated_dock_hours,
                    "actual_hours": actual_dock_hours,
                    "variance_hours": variance,
                },
                action=action,
                reason=f"Dock time exceeded estimate by {variance:.1f} hours. "
                f"Route feasibility may be affected.",
            )

        return None

    def check_load_changes(
        self, plan_id: str, change_type: str, stop_data: Optional[dict] = None
    ) -> Optional[UpdateTrigger]:
        """
        Trigger 3: Load Added or Cancelled Mid-Route.

        Triggered by dispatcher action or TMS webhook.
        """
        if change_type not in ["load_added", "load_cancelled"]:
            return None

        return UpdateTrigger(
            trigger_type=change_type,
            priority="HIGH",
            trigger_data={"stop_data": stop_data} if stop_data else {},
            action="RE_SEQUENCE_STOPS",
            reason=f"Load {change_type.split('_')[1]}: Route must be re-sequenced",
        )

    def check_driver_rest_requests(
        self, plan_id: str, driver_id: str, rest_location: Optional[dict] = None
    ) -> Optional[UpdateTrigger]:
        """
        Trigger 4: Driver Manual Rest Request.

        Triggered when driver says "I want to rest here".
        Always honored (driver safety override).
        """
        return UpdateTrigger(
            trigger_type="driver_rest_request",
            priority="HIGH",
            trigger_data={"driver_id": driver_id, "rest_location": rest_location or {}},
            action="UPDATE_HOS_AND_REPLAN",
            reason="Driver requested rest stop. Safety override.",
        )

    # ==========================================================================
    # CATEGORY 2: HOS COMPLIANCE MONITORING (3 triggers) - CRITICAL
    # ==========================================================================

    def check_hos_approaching_limits(
        self, plan_id: str, driver_id: str, driver_hos: dict, remaining_route: List[dict]
    ) -> Optional[UpdateTrigger]:
        """
        Trigger 5: HOS Approaching Limits (PROACTIVE).

        Warns BEFORE violation occurs.
        Simulates remaining route HOS consumption.
        """
        hours_driven = driver_hos["hours_driven"]
        on_duty_time = driver_hos["on_duty_time"]
        hours_since_break = driver_hos["hours_since_break"]

        # Calculate hours until limits
        hours_until_drive_limit = 11 - hours_driven
        hours_until_duty_limit = 14 - on_duty_time
        hours_until_break_required = 8 - hours_since_break

        # Calculate hours needed for remaining route
        total_drive_needed = sum(seg.get("drive_time_hours", 0) for seg in remaining_route)
        total_duty_needed = sum(
            seg.get("drive_time_hours", 0) + seg.get("dock_time_hours", 0)
            for seg in remaining_route
        )

        # Check drive limit
        if hours_until_drive_limit < total_drive_needed:
            shortfall = total_drive_needed - hours_until_drive_limit

            return UpdateTrigger(
                trigger_type="hos_drive_limit_approaching",
                priority="HIGH",
                trigger_data={
                    "hours_remaining": hours_until_drive_limit,
                    "hours_needed": total_drive_needed,
                    "shortfall": shortfall,
                },
                action="INSERT_REST_STOP",
                reason=f"Drive limit approaching: {hours_until_drive_limit:.1f}h remaining, "
                f"{total_drive_needed:.1f}h needed. Shortfall: {shortfall:.1f}h",
            )

        # Check duty limit
        if hours_until_duty_limit < total_duty_needed:
            shortfall = total_duty_needed - hours_until_duty_limit

            return UpdateTrigger(
                trigger_type="hos_duty_limit_approaching",
                priority="HIGH",
                trigger_data={
                    "hours_remaining": hours_until_duty_limit,
                    "hours_needed": total_duty_needed,
                    "shortfall": shortfall,
                },
                action="INSERT_REST_STOP",
                reason=f"Duty limit approaching: {hours_until_duty_limit:.1f}h remaining, "
                f"{total_duty_needed:.1f}h needed. Shortfall: {shortfall:.1f}h",
            )

        # Check break requirement
        if hours_until_break_required < 1:  # Within 1 hour
            return UpdateTrigger(
                trigger_type="break_required_soon",
                priority="MEDIUM",
                trigger_data={"minutes_until_break": hours_until_break_required * 60},
                action="INSERT_BREAK",
                reason=f"30-minute break required in {hours_until_break_required * 60:.0f} minutes",
            )

        # Warning: Marginal feasibility
        if hours_until_drive_limit < 2 or hours_until_duty_limit < 2:
            logger.warning(
                f"HOS approaching limits: "
                f"{hours_until_drive_limit:.1f}h drive, "
                f"{hours_until_duty_limit:.1f}h duty remaining"
            )

        return None

    def check_hos_violations(self, plan_id: str, driver_id: str, driver_hos: dict) -> Optional[UpdateTrigger]:
        """
        Trigger 6: HOS Violations Detected (REACTIVE).

        Detects violations and forces mandatory rest.
        Should rarely happen if proactive monitoring works.
        """
        hours_driven = driver_hos["hours_driven"]
        on_duty_time = driver_hos["on_duty_time"]
        hours_since_break = driver_hos["hours_since_break"]

        # Violation 1: Exceeded drive limit
        if hours_driven > 11:
            return UpdateTrigger(
                trigger_type="hos_violation_drive",
                priority="CRITICAL",
                trigger_data={"hours_driven": hours_driven},
                action="MANDATORY_REST_IMMEDIATE",
                reason=f"CRITICAL: Drive limit exceeded ({hours_driven:.1f}h / 11h). "
                f"Mandatory rest required IMMEDIATELY.",
            )

        # Violation 2: Exceeded duty limit
        if on_duty_time > 14:
            return UpdateTrigger(
                trigger_type="hos_violation_duty",
                priority="CRITICAL",
                trigger_data={"on_duty_hours": on_duty_time},
                action="MANDATORY_REST_IMMEDIATE",
                reason=f"CRITICAL: Duty limit exceeded ({on_duty_time:.1f}h / 14h). "
                f"Mandatory rest required IMMEDIATELY.",
            )

        # Violation 3: Break missed
        if hours_since_break > 8:
            return UpdateTrigger(
                trigger_type="break_violation",
                priority="CRITICAL",
                trigger_data={"hours_since_break": hours_since_break},
                action="MANDATORY_BREAK_IMMEDIATE",
                reason=f"CRITICAL: Break requirement exceeded ({hours_since_break:.1f}h / 8h). "
                f"Mandatory 30-minute break required IMMEDIATELY.",
            )

        return None

    def check_rest_completion_status(
        self, plan_id: str, driver_id: str, planned_rest_hours: float, actual_rest_hours: float
    ) -> Optional[UpdateTrigger]:
        """
        Trigger 7: Rest Period Completion Changes.

        Monitors rest periods - did driver rest as planned?
        """
        variance = actual_rest_hours - planned_rest_hours

        if abs(variance) > 0.5:  # More than 30 minutes difference
            return UpdateTrigger(
                trigger_type="rest_duration_changed",
                priority="MEDIUM",
                trigger_data={
                    "planned_hours": planned_rest_hours,
                    "actual_hours": actual_rest_hours,
                    "variance": variance,
                },
                action="UPDATE_HOS_AND_REPLAN_REMAINING",
                reason=f"Rest duration changed: Planned {planned_rest_hours:.1f}h, "
                f"actual {actual_rest_hours:.1f}h. HOS state differs from plan.",
            )

        return None

    # ==========================================================================
    # CATEGORY 3: VEHICLE/OPERATIONAL (3 triggers)
    # ==========================================================================

    def check_fuel_level(
        self,
        plan_id: str,
        vehicle_id: str,
        current_fuel: float,
        fuel_capacity: float,
        remaining_route: List[dict],
        mpg: float,
    ) -> Optional[UpdateTrigger]:
        """
        Trigger 8: Fuel Level Low.

        Monitors fuel consumption vs expectations.
        """
        fuel_percentage = current_fuel / fuel_capacity

        # Calculate fuel needed
        total_distance_remaining = sum(seg.get("distance_miles", 0) for seg in remaining_route)
        fuel_needed = total_distance_remaining / mpg
        fuel_available = current_fuel

        # Check if insufficient (with 20% safety margin)
        if fuel_available < fuel_needed * 1.2:
            priority = "CRITICAL" if fuel_percentage < 0.15 else "HIGH"

            return UpdateTrigger(
                trigger_type="fuel_low",
                priority=priority,
                trigger_data={
                    "fuel_available": fuel_available,
                    "fuel_needed": fuel_needed,
                    "distance_remaining": total_distance_remaining,
                    "fuel_percentage": fuel_percentage * 100,
                },
                action="INSERT_FUEL_STOP",
                reason=f"Fuel low: {fuel_available:.1f} gal available, "
                f"{fuel_needed:.1f} gal needed (+ 20% buffer). "
                f"Current level: {fuel_percentage * 100:.1f}%",
            )

        return None

    def check_vehicle_status(self, vehicle_id: str) -> Optional[UpdateTrigger]:
        """
        Trigger 9: Vehicle Breakdown/Maintenance (Phase 2).

        Monitors vehicle health via telematics.
        """
        # TODO: Phase 2 - Integrate with telematics API
        return None

    def check_speed_pace_deviations(
        self, plan_id: str, driver_id: str, current_segment: dict, actual_speed: float
    ) -> Optional[UpdateTrigger]:
        """
        Trigger 10: Speed/Pace Deviations.

        Detects if driver is going slower/faster than expected.
        """
        expected_speed = current_segment.get("expected_speed_mph", 55)
        speed_deviation_pct = (actual_speed - expected_speed) / expected_speed

        if abs(speed_deviation_pct) > self.SPEED_DEVIATION_THRESHOLD_PCT:
            return UpdateTrigger(
                trigger_type="speed_deviation",
                priority="MEDIUM",
                trigger_data={
                    "expected_speed": expected_speed,
                    "actual_speed": actual_speed,
                    "deviation_pct": speed_deviation_pct * 100,
                },
                action="UPDATE_ETAS",
                reason=f"Speed deviation: Expected {expected_speed:.0f} mph, "
                f"actual {actual_speed:.0f} mph "
                f"({speed_deviation_pct * 100:+.1f}% deviation)",
            )

        return None

    # ==========================================================================
    # CATEGORY 4: APPOINTMENT/CUSTOMER (2 triggers)
    # ==========================================================================

    def check_appointment_changes(
        self, plan_id: str, stop_id: str, old_appointment: datetime, new_appointment: datetime
    ) -> Optional[UpdateTrigger]:
        """
        Trigger 11: Appointment Time Changes.

        Customer changes appointment time.
        """
        delta_hours = abs((new_appointment - old_appointment).total_seconds() / 3600)

        if delta_hours > 0.5:  # More than 30 minutes change
            return UpdateTrigger(
                trigger_type="appointment_changed",
                priority="MEDIUM",
                trigger_data={
                    "stop_id": stop_id,
                    "old_appointment": old_appointment.isoformat(),
                    "new_appointment": new_appointment.isoformat(),
                    "delta_hours": delta_hours,
                },
                action="ADJUST_STOP_SEQUENCE",
                reason=f"Appointment time changed by {delta_hours:.1f} hours. "
                f"May need to re-sequence stops.",
            )

        return None

    def check_dock_availability(self, plan_id: str, stop_id: str) -> Optional[UpdateTrigger]:
        """
        Trigger 12: Dock Unavailability.

        Dock closed unexpectedly or unavailable.
        """
        # TODO: Check dock status (manual report or API integration)
        dock_unavailable = False  # Placeholder

        if dock_unavailable:
            return UpdateTrigger(
                trigger_type="dock_unavailable",
                priority="HIGH",
                trigger_data={"stop_id": stop_id},
                action="SKIP_OR_RESCHEDULE_STOP",
                reason="Dock unavailable. Stop must be skipped or rescheduled.",
            )

        return None

    # ==========================================================================
    # CATEGORY 5: ENVIRONMENTAL/EXTERNAL (2 triggers - Phase 2)
    # ==========================================================================

    def check_weather_conditions(self, plan_id: str, current_segment: dict) -> Optional[UpdateTrigger]:
        """
        Trigger 13: Weather Events (Phase 2).

        Severe weather impacts driving conditions.
        """
        # TODO: Phase 2 - Integrate with Weather API
        return None

    def check_weigh_station_delays(self, plan_id: str) -> Optional[UpdateTrigger]:
        """
        Trigger 14: Weigh Station Delays (Phase 2).

        Required weigh station stops taking longer than expected.
        """
        # TODO: Phase 2 - Track weigh station delays
        return None

    # ==========================================================================
    # RE-PLAN DECISION LOGIC
    # ==========================================================================

    def should_replan(self, trigger: UpdateTrigger) -> ReplanDecision:
        """
        Decide if re-plan is needed based on trigger type and priority.

        Decision Matrix:
        - CRITICAL: Always re-plan
        - HIGH: Re-plan if impact > threshold
        - MEDIUM: ETA update only
        - LOW: No action
        """
        if trigger.priority == "CRITICAL":
            return ReplanDecision(
                replan_triggered=True,
                action=trigger.action,
                reason="Critical safety/compliance issue",
                priority=trigger.priority,
                trigger_type=trigger.trigger_type,
            )

        if trigger.priority == "HIGH":
            # Calculate impact (simplified for MVP)
            # In full implementation, would calculate actual hour impact
            impact_hours = 1.5  # Placeholder

            if impact_hours > 1:
                return ReplanDecision(
                    replan_triggered=True,
                    action=trigger.action,
                    reason=f"High impact: {impact_hours:.1f}h",
                    priority=trigger.priority,
                    trigger_type=trigger.trigger_type,
                )
            else:
                return ReplanDecision(
                    replan_triggered=False,
                    action="UPDATE_ETAS",
                    reason="Impact below threshold",
                    priority=trigger.priority,
                    trigger_type=trigger.trigger_type,
                )

        if trigger.priority == "MEDIUM":
            return ReplanDecision(
                replan_triggered=False,
                action="UPDATE_ETAS",
                reason="Medium priority, ETA adjustment sufficient",
                priority=trigger.priority,
                trigger_type=trigger.trigger_type,
            )

        # LOW priority - no action
        return ReplanDecision(
            replan_triggered=False,
            action="NO_ACTION",
            reason="Low priority",
            priority=trigger.priority,
            trigger_type=trigger.trigger_type,
        )

    # ==========================================================================
    # MONITORING ORCHESTRATION
    # ==========================================================================

    def monitor_route_execution(self, plan_id: str) -> List[UpdateTrigger]:
        """
        Main monitoring loop - checks all trigger categories.

        Returns list of triggers that fired.
        """
        triggers = []

        # TODO: Get plan details from database
        # For MVP, this would be implemented with actual database queries

        # Category 1: External Events
        # trigger = self.check_traffic_updates(plan_id, "current_segment_id")
        # if trigger:
        #     triggers.append(trigger)

        # Category 2: HOS Compliance (CRITICAL)
        # trigger = self.check_hos_approaching_limits(plan_id, "driver_id", driver_hos, remaining_route)
        # if trigger:
        #     triggers.append(trigger)

        # Category 3: Vehicle/Operational
        # ...

        # Category 4: Appointment/Customer
        # ...

        logger.info(f"Monitoring complete for plan {plan_id}: {len(triggers)} triggers fired")

        return triggers
