"""Response schemas for route planning API endpoints."""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class DataSourceBadge(BaseModel):
    """Data source badge for UI display."""

    label: str = Field(..., description="Current data source label")
    color: str = Field(..., description="Badge color (gray/green)")
    tooltip: str = Field(..., description="Tooltip text with future integration info")


class RouteSegmentResponse(BaseModel):
    """Response for a single route segment."""

    sequence_order: int = Field(..., description="Order in the route")
    segment_type: str = Field(..., description="Type: drive, rest, fuel, dock")

    # Locations
    from_location: Optional[str] = Field(None, description="Starting location name")
    to_location: Optional[str] = Field(None, description="Ending location name")

    # Drive segment data
    distance_miles: Optional[float] = Field(None, description="Distance for drive segments")
    drive_time_hours: Optional[float] = Field(None, description="Drive time in hours")

    # Rest segment data
    rest_type: Optional[str] = Field(None, description="full_rest, partial_rest, or break")
    rest_duration_hours: Optional[float] = Field(None, description="Rest duration")
    rest_reason: Optional[str] = Field(None, description="Why rest is needed")

    # Fuel segment data
    fuel_gallons: Optional[float] = Field(None, description="Gallons to fuel")
    fuel_cost_estimate: Optional[float] = Field(None, description="Estimated fuel cost")
    fuel_station_name: Optional[str] = Field(None, description="Fuel station name")

    # Dock segment data
    dock_duration_hours: Optional[float] = Field(None, description="Dock duration")
    customer_name: Optional[str] = Field(None, description="Customer name")

    # HOS state after segment
    hos_state_after: Optional[dict] = Field(None, description="HOS state after this segment")

    # Time estimates
    estimated_arrival: Optional[datetime] = Field(None, description="Estimated arrival time")
    estimated_departure: Optional[datetime] = Field(None, description="Estimated departure time")

    class Config:
        json_schema_extra = {
            "example": {
                "sequence_order": 1,
                "segment_type": "drive",
                "from_location": "Origin Warehouse",
                "to_location": "Customer A",
                "distance_miles": 120.5,
                "drive_time_hours": 2.0,
                "hos_state_after": {
                    "hours_driven": 7.5,
                    "on_duty_time": 8.0,
                    "hours_since_break": 7.0,
                },
                "estimated_arrival": "2026-01-23T14:00:00Z",
            }
        }


class ComplianceReportResponse(BaseModel):
    """HOS compliance report for the route."""

    max_drive_hours_used: float = Field(..., description="Maximum drive hours used (out of 11)")
    max_duty_hours_used: float = Field(..., description="Maximum duty hours used (out of 14)")
    breaks_required: int = Field(..., description="Number of breaks required")
    breaks_planned: int = Field(..., description="Number of rest stops planned")
    violations: List[str] = Field(default_factory=list, description="List of violations if any")

    class Config:
        json_schema_extra = {
            "example": {
                "max_drive_hours_used": 10.5,
                "max_duty_hours_used": 13.0,
                "breaks_required": 2,
                "breaks_planned": 2,
                "violations": [],
            }
        }


class RestStopInfo(BaseModel):
    """Information about a rest stop."""

    location: str = Field(..., description="Rest stop location name")
    type: str = Field(..., description="Rest type: full_rest, partial_rest, break")
    duration_hours: float = Field(..., description="Rest duration in hours")
    reason: str = Field(..., description="Reason for rest")


class FuelStopInfo(BaseModel):
    """Information about a fuel stop."""

    location: str = Field(..., description="Fuel station name")
    gallons: float = Field(..., description="Gallons to fuel")
    cost: float = Field(..., description="Estimated cost")


class RouteSummary(BaseModel):
    """Summary of the route plan."""

    total_driving_segments: int = Field(..., description="Number of driving segments")
    total_rest_stops: int = Field(..., description="Number of rest stops")
    total_fuel_stops: int = Field(..., description="Number of fuel stops")
    total_dock_stops: int = Field(..., description="Number of dock stops")
    estimated_completion: Optional[datetime] = Field(None, description="Estimated completion time")


class RoutePlanningResponse(BaseModel):
    """Response schema for route planning optimization."""

    plan_id: str = Field(..., description="Unique plan identifier")
    plan_version: int = Field(default=1, description="Plan version number")
    is_feasible: bool = Field(..., description="Is the route feasible within HOS limits?")
    feasibility_issues: List[str] = Field(default_factory=list, description="Issues if not feasible")

    # Optimized route details
    optimized_sequence: List[str] = Field(..., description="Optimized stop sequence (stop IDs)")
    segments: List[RouteSegmentResponse] = Field(..., description="All route segments")

    # Totals
    total_distance_miles: float = Field(..., description="Total distance")
    total_time_hours: float = Field(..., description="Total time including all activities")
    total_cost_estimate: float = Field(..., description="Total estimated cost (fuel + tolls)")

    # Stops
    rest_stops: List[RestStopInfo] = Field(default_factory=list, description="Rest stops")
    fuel_stops: List[FuelStopInfo] = Field(default_factory=list, description="Fuel stops")

    # Summary
    summary: RouteSummary = Field(..., description="Route summary")
    compliance_report: ComplianceReportResponse = Field(..., description="HOS compliance report")

    # Data sources
    data_sources: dict = Field(
        default_factory=dict, description="Data source badges for all data types"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "plan_id": "plan_123456",
                "plan_version": 1,
                "is_feasible": True,
                "feasibility_issues": [],
                "optimized_sequence": ["stop_001", "stop_002", "stop_003"],
                "segments": [
                    {
                        "sequence_order": 1,
                        "segment_type": "drive",
                        "from_location": "Origin",
                        "to_location": "Customer A",
                        "distance_miles": 120.5,
                        "drive_time_hours": 2.0,
                        "hos_state_after": {
                            "hours_driven": 7.5,
                            "on_duty_time": 8.0,
                            "hours_since_break": 7.0,
                        },
                    }
                ],
                "total_distance_miles": 450.5,
                "total_time_hours": 18.5,
                "total_cost_estimate": 340.50,
                "rest_stops": [
                    {
                        "location": "Truck Stop - I-80 Exit 123",
                        "type": "full_rest",
                        "duration_hours": 10.0,
                        "reason": "HOS 11h drive limit reached",
                    }
                ],
                "fuel_stops": [
                    {
                        "location": "Pilot Fuel - I-80 Exit 120",
                        "gallons": 85.0,
                        "cost": 340.50,
                    }
                ],
                "summary": {
                    "total_driving_segments": 5,
                    "total_rest_stops": 2,
                    "total_fuel_stops": 1,
                    "total_dock_stops": 4,
                    "estimated_completion": "2026-01-24T08:00:00Z",
                },
                "compliance_report": {
                    "max_drive_hours_used": 10.5,
                    "max_duty_hours_used": 13.0,
                    "breaks_required": 2,
                    "breaks_planned": 2,
                    "violations": [],
                },
            }
        }


class ETAChange(BaseModel):
    """ETA change information."""

    stop_id: str = Field(..., description="Stop ID")
    old_eta: datetime = Field(..., description="Previous ETA")
    new_eta: datetime = Field(..., description="Updated ETA")
    delay_minutes: int = Field(..., description="Delay in minutes")


class ImpactSummary(BaseModel):
    """Impact summary for updates that don't trigger re-plan."""

    eta_changes: List[ETAChange] = Field(default_factory=list, description="ETA changes")
    no_replan_reason: str = Field(..., description="Why re-plan was not triggered")


class RouteUpdateResponse(BaseModel):
    """Response schema for route update requests."""

    update_id: str = Field(..., description="Update identifier")
    plan_id: str = Field(..., description="Plan ID")
    replan_triggered: bool = Field(..., description="Was a re-plan triggered?")

    # If no re-plan
    impact_summary: Optional[ImpactSummary] = Field(None, description="Impact if no re-plan")

    # If re-plan triggered
    new_plan: Optional[RoutePlanningResponse] = Field(None, description="New plan if re-planned")

    class Config:
        json_schema_extra = {
            "example": {
                "update_id": "update_789",
                "plan_id": "plan_123",
                "replan_triggered": False,
                "impact_summary": {
                    "eta_changes": [
                        {
                            "stop_id": "stop_002",
                            "old_eta": "2026-01-23T14:00:00Z",
                            "new_eta": "2026-01-23T14:45:00Z",
                            "delay_minutes": 45,
                        }
                    ],
                    "no_replan_reason": "Delay under threshold (30min)",
                },
            }
        }


class CurrentSegmentInfo(BaseModel):
    """Current segment information."""

    sequence_order: int = Field(..., description="Segment sequence number")
    segment_type: str = Field(..., description="Segment type")
    from_location: Optional[str] = Field(None, description="From location")
    to_location: Optional[str] = Field(None, description="To location")
    progress_percent: float = Field(..., description="Progress percentage")
    estimated_arrival: Optional[datetime] = Field(None, description="ETA")


class RouteAlert(BaseModel):
    """Route alert/warning."""

    type: str = Field(..., description="Alert type")
    message: str = Field(..., description="Alert message")
    severity: str = Field(..., description="Severity: info, warning, critical")


class RouteStatusResponse(BaseModel):
    """Response schema for route status."""

    driver_id: str = Field(..., description="Driver ID")
    plan_id: str = Field(..., description="Current plan ID")
    current_plan: RoutePlanningResponse = Field(..., description="Current route plan")
    current_segment: CurrentSegmentInfo = Field(..., description="Current segment info")
    upcoming_segments: List[RouteSegmentResponse] = Field(
        default_factory=list, description="Next 3-5 segments"
    )
    alerts: List[RouteAlert] = Field(default_factory=list, description="Active alerts")

    class Config:
        json_schema_extra = {
            "example": {
                "driver_id": "DRV-12345",
                "plan_id": "plan_123",
                "current_segment": {
                    "sequence_order": 3,
                    "segment_type": "drive",
                    "from_location": "Stop A",
                    "to_location": "Truck Stop X",
                    "progress_percent": 45.0,
                    "estimated_arrival": "2026-01-23T14:30:00Z",
                },
                "alerts": [
                    {
                        "type": "hos_warning",
                        "message": "Approaching 11h drive limit in 1.5h",
                        "severity": "warning",
                    }
                ],
            }
        }
