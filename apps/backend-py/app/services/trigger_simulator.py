"""Trigger Simulator for simulating real-world events that require route plan updates."""

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import RoutePlan, RouteSegment, RoutePlanUpdate, Driver, Vehicle
from app.utils.logger import get_logger

logger = get_logger(__name__)


@dataclass
class TriggerInput:
    """Input data for a single trigger."""

    trigger_type: str  # dock_time_change, traffic_delay, driver_rest_request, fuel_price_spike, appointment_change, hos_violation
    segment_id: Optional[str] = None
    data: Dict[str, Any] = None

    def __post_init__(self):
        if self.data is None:
            self.data = {}


@dataclass
class TriggerImpact:
    """Impact analysis for a trigger."""

    trigger_type: str
    segment_affected: Optional[str]
    description: str
    eta_change_hours: float
    requires_replan: bool


@dataclass
class SimulationResult:
    """Result of trigger simulation."""

    previous_plan_version: int
    new_plan_version: int
    new_plan_id: str
    triggers_applied: int
    impact_summary: Dict[str, Any]
    replan_triggered: bool
    replan_reason: Optional[str]


class TriggerSimulator:
    """
    Simulates real-world events that require route plan updates.

    Supported triggers:
    - dock_time_change: Actual dock time differs from estimate
    - traffic_delay: Traffic delay on a segment
    - driver_rest_request: Driver requests early rest
    - fuel_price_spike: Fuel price change at station
    - appointment_change: Customer changes time window
    - hos_violation: Driver exceeded hours (reactive)
    """

    def __init__(self, session: AsyncSession):
        """Initialize TriggerSimulator."""
        self.session = session

    async def apply_triggers(
        self,
        plan_id: str,
        triggers: List[TriggerInput],
    ) -> SimulationResult:
        """
        Apply multiple triggers to a route plan and generate new version.

        Args:
            plan_id: ID of the route plan to update
            triggers: List of triggers to apply

        Returns:
            SimulationResult with new plan version and impact summary

        Raises:
            ValueError: If plan not found or invalid trigger
        """
        logger.info(
            "trigger_simulation_started",
            plan_id=plan_id,
            trigger_count=len(triggers),
        )

        # Load current plan
        result = await self.session.execute(
            select(RoutePlan).where(RoutePlan.plan_id == plan_id)
        )
        current_plan = result.scalar_one_or_none()

        if not current_plan:
            raise ValueError(f"Route plan not found: {plan_id}")

        # Analyze triggers and determine if replan is needed
        impacts = []
        total_eta_change = 0.0
        replan_needed = False
        replan_reasons = []

        for trigger in triggers:
            impact = await self._analyze_trigger(current_plan, trigger)
            impacts.append(impact)
            total_eta_change += impact.eta_change_hours

            if impact.requires_replan:
                replan_needed = True
                replan_reasons.append(impact.description)

        # Apply triggers to driver/vehicle state
        await self._update_driver_vehicle_state(current_plan, triggers)

        # Determine action: Re-plan or ETA update only
        if replan_needed:
            # Generate new route plan
            new_plan = await self._replan_route(current_plan, triggers, impacts)
            new_version = current_plan.plan_version + 1

            # Create RoutePlanUpdate record
            await self._create_update_record(
                current_plan,
                new_plan,
                triggers,
                impacts,
                replan_reasons,
            )

            logger.info(
                "trigger_simulation_replan",
                plan_id=plan_id,
                old_version=current_plan.plan_version,
                new_version=new_version,
            )
        else:
            # Just update ETAs (simplified - would update segment times in real implementation)
            new_plan = current_plan
            new_version = current_plan.plan_version

            logger.info(
                "trigger_simulation_eta_update",
                plan_id=plan_id,
                version=new_version,
                eta_change=total_eta_change,
            )

        # Compile impact summary
        impact_summary = {
            "total_eta_change_hours": round(total_eta_change, 2),
            "rest_stops_added": 0,  # Would calculate from new vs old plan
            "fuel_stops_added": 0,
            "compliance_issues": [],
            "trigger_impacts": [
                {
                    "type": impact.trigger_type,
                    "segment": impact.segment_affected,
                    "description": impact.description,
                    "eta_change_hours": impact.eta_change_hours,
                }
                for impact in impacts
            ],
        }

        result = SimulationResult(
            previous_plan_version=current_plan.plan_version,
            new_plan_version=new_version,
            new_plan_id=new_plan.plan_id,
            triggers_applied=len(triggers),
            impact_summary=impact_summary,
            replan_triggered=replan_needed,
            replan_reason=" | ".join(replan_reasons) if replan_reasons else None,
        )

        logger.info(
            "trigger_simulation_completed",
            plan_id=plan_id,
            triggers_applied=len(triggers),
            replan_triggered=replan_needed,
        )

        return result

    async def _analyze_trigger(
        self,
        plan: RoutePlan,
        trigger: TriggerInput,
    ) -> TriggerImpact:
        """Analyze a single trigger and determine impact."""
        trigger_type = trigger.trigger_type

        if trigger_type == "dock_time_change":
            actual_hours = trigger.data.get("actual_dock_hours", 0)
            estimated_hours = trigger.data.get("estimated_dock_hours", 0)
            variance = actual_hours - estimated_hours

            return TriggerImpact(
                trigger_type=trigger_type,
                segment_affected=trigger.segment_id,
                description=f"Dock time exceeded estimate by {variance:.1f}h",
                eta_change_hours=variance,
                requires_replan=abs(variance) > 2.0,  # Replan if variance > 2h
            )

        elif trigger_type == "traffic_delay":
            delay_minutes = trigger.data.get("delay_minutes", 0)
            delay_hours = delay_minutes / 60.0

            return TriggerImpact(
                trigger_type=trigger_type,
                segment_affected=trigger.segment_id,
                description=f"Traffic delay of {delay_minutes} minutes",
                eta_change_hours=delay_hours,
                requires_replan=delay_hours > 1.0,  # Replan if delay > 1h
            )

        elif trigger_type == "driver_rest_request":
            location = trigger.data.get("location", "current location")
            reason = trigger.data.get("reason", "fatigue")

            return TriggerImpact(
                trigger_type=trigger_type,
                segment_affected=trigger.segment_id,
                description=f"Driver requests rest at {location} due to {reason}",
                eta_change_hours=10.0,  # Assume full rest
                requires_replan=True,  # Always replan for rest request
            )

        elif trigger_type == "fuel_price_spike":
            old_price = trigger.data.get("old_price", 0)
            new_price = trigger.data.get("new_price", 0)
            station = trigger.data.get("station", "")

            return TriggerImpact(
                trigger_type=trigger_type,
                segment_affected=trigger.segment_id,
                description=f"Fuel price at {station} changed from ${old_price:.2f} to ${new_price:.2f}",
                eta_change_hours=0.5,  # May reroute to cheaper station
                requires_replan=abs(new_price - old_price) > 0.50,  # Replan if >$0.50 change
            )

        elif trigger_type == "appointment_change":
            old_time = trigger.data.get("old_appointment", "")
            new_time = trigger.data.get("new_appointment", "")

            return TriggerImpact(
                trigger_type=trigger_type,
                segment_affected=trigger.segment_id,
                description=f"Appointment changed from {old_time} to {new_time}",
                eta_change_hours=2.0,  # Estimate
                requires_replan=True,  # Always replan for appointment change
            )

        elif trigger_type == "hos_violation":
            violation_type = trigger.data.get("violation_type", "unknown")

            return TriggerImpact(
                trigger_type=trigger_type,
                segment_affected=trigger.segment_id,
                description=f"HOS violation detected: {violation_type}",
                eta_change_hours=10.0,  # Must insert rest
                requires_replan=True,  # Always replan for violation
            )

        else:
            raise ValueError(f"Unknown trigger type: {trigger_type}")

    async def _update_driver_vehicle_state(
        self,
        plan: RoutePlan,
        triggers: List[TriggerInput],
    ) -> None:
        """Update driver and vehicle state based on triggers."""
        # Load driver and vehicle
        result_driver = await self.session.execute(
            select(Driver).where(Driver.id == plan.driver_id)
        )
        driver = result_driver.scalar_one_or_none()

        result_vehicle = await self.session.execute(
            select(Vehicle).where(Vehicle.id == plan.vehicle_id)
        )
        vehicle = result_vehicle.scalar_one_or_none()

        # Apply state changes based on triggers
        for trigger in triggers:
            if trigger.trigger_type == "dock_time_change":
                # Update driver on-duty time
                if driver:
                    variance = trigger.data.get("actual_dock_hours", 0) - trigger.data.get("estimated_dock_hours", 0)
                    driver.on_duty_time_today += variance

            elif trigger.trigger_type == "traffic_delay":
                # Update driver hours
                if driver:
                    delay_hours = trigger.data.get("delay_minutes", 0) / 60.0
                    driver.hours_driven_today += delay_hours
                    driver.on_duty_time_today += delay_hours

            elif trigger.trigger_type == "driver_rest_request":
                # Reset driver hours (simulate rest)
                if driver:
                    driver.hours_driven_today = 0
                    driver.on_duty_time_today = 0
                    driver.hours_since_break = 0

        await self.session.flush()

    async def _replan_route(
        self,
        current_plan: RoutePlan,
        triggers: List[TriggerInput],
        impacts: List[TriggerImpact],
    ) -> RoutePlan:
        """Generate new route plan based on triggers."""
        # In a real implementation, this would call the full route planning service
        # For now, we'll create a simplified new plan version

        # This is a placeholder - actual implementation would:
        # 1. Load current segments and stops
        # 2. Rebuild route with updated constraints
        # 3. Call route optimization engine
        # 4. Return new plan

        # For MVP, we'll just increment version and mark as needing replan
        new_plan = RoutePlan(
            plan_id=f"{current_plan.plan_id}-v{current_plan.plan_version + 1}",
            driver_id=current_plan.driver_id,
            vehicle_id=current_plan.vehicle_id,
            route_id=current_plan.route_id,
            load_id=current_plan.load_id,
            plan_version=current_plan.plan_version + 1,
            is_active=True,
            status="active",
            optimization_priority=current_plan.optimization_priority,
            total_distance_miles=current_plan.total_distance_miles,
            total_drive_time_hours=current_plan.total_drive_time_hours,
            total_on_duty_time_hours=current_plan.total_on_duty_time_hours,
            total_cost_estimate=current_plan.total_cost_estimate,
            is_feasible=True,
        )

        # Deactivate old plan
        current_plan.is_active = False

        self.session.add(new_plan)
        await self.session.flush()

        return new_plan

    async def _create_update_record(
        self,
        current_plan: RoutePlan,
        new_plan: RoutePlan,
        triggers: List[TriggerInput],
        impacts: List[TriggerImpact],
        replan_reasons: List[str],
    ) -> None:
        """Create RoutePlanUpdate record for audit trail."""
        update = RoutePlanUpdate(
            update_id=f"UPDATE-{new_plan.plan_id}",
            plan_id=new_plan.id,
            update_type="trigger_simulation",
            triggered_at=datetime.now(timezone.utc),
            triggered_by="simulation",
            trigger_data={
                "triggers": [
                    {
                        "type": t.trigger_type,
                        "segment_id": t.segment_id,
                        "data": t.data,
                    }
                    for t in triggers
                ]
            },
            replan_triggered=True,
            replan_reason=" | ".join(replan_reasons),
            previous_plan_version=current_plan.plan_version,
            new_plan_version=new_plan.plan_version,
            impact_summary={
                "triggers_applied": len(triggers),
                "impacts": [
                    {
                        "type": impact.trigger_type,
                        "segment": impact.segment_affected,
                        "description": impact.description,
                        "eta_change": impact.eta_change_hours,
                    }
                    for impact in impacts
                ],
            },
        )

        self.session.add(update)
        await self.session.flush()
