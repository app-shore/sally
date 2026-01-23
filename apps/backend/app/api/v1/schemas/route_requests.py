"""Request schemas for route planning API endpoints."""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class StopInput(BaseModel):
    """Input for a single stop in the route."""

    stop_id: str = Field(..., description="Unique identifier for the stop")
    name: str = Field(..., description="Stop name/location")
    lat: float = Field(..., description="Latitude", ge=-90, le=90)
    lon: float = Field(..., description="Longitude", ge=-180, le=180)
    location_type: str = Field(
        ...,
        description="Type of location",
        pattern="^(warehouse|customer|distribution_center|truck_stop|service_area|fuel_station)$",
    )

    is_origin: bool = Field(default=False, description="Is this the starting point?")
    is_destination: bool = Field(default=False, description="Is this the final destination?")

    # Time windows (optional)
    earliest_arrival: Optional[str] = Field(None, description="Earliest arrival time (HH:MM format)")
    latest_arrival: Optional[str] = Field(None, description="Latest arrival time (HH:MM format)")

    # Dock info (for customer/warehouse stops)
    estimated_dock_hours: float = Field(default=0.0, description="Expected dock duration in hours", ge=0)
    customer_name: Optional[str] = Field(None, description="Customer name if applicable")

    class Config:
        json_schema_extra = {
            "example": {
                "stop_id": "stop_001",
                "name": "Distribution Center Alpha",
                "lat": 41.8781,
                "lon": -87.6298,
                "location_type": "warehouse",
                "is_origin": True,
                "is_destination": False,
                "estimated_dock_hours": 2.0,
            }
        }


class DriverStateInput(BaseModel):
    """Current HOS state of the driver."""

    hours_driven: float = Field(..., description="Hours driven in current duty period", ge=0, le=11)
    on_duty_time: float = Field(..., description="Total on-duty time", ge=0, le=14)
    hours_since_break: float = Field(..., description="Hours since last 30-min break", ge=0, le=8)

    class Config:
        json_schema_extra = {
            "example": {
                "hours_driven": 5.5,
                "on_duty_time": 6.0,
                "hours_since_break": 5.0,
            }
        }


class VehicleStateInput(BaseModel):
    """Current state of the vehicle."""

    fuel_capacity_gallons: float = Field(..., description="Fuel tank capacity", gt=0)
    current_fuel_gallons: float = Field(..., description="Current fuel level", ge=0)
    mpg: float = Field(..., description="Miles per gallon", gt=0)

    class Config:
        json_schema_extra = {
            "example": {
                "fuel_capacity_gallons": 200.0,
                "current_fuel_gallons": 120.0,
                "mpg": 6.5,
            }
        }


class DriverPreferencesInput(BaseModel):
    """Driver preferences for route planning."""

    preferred_rest_duration: int = Field(
        default=10, description="Preferred rest duration (7, 8, or 10 hours)", ge=7, le=10
    )
    avoid_night_driving: bool = Field(default=False, description="Prefer to avoid night driving")

    class Config:
        json_schema_extra = {
            "example": {
                "preferred_rest_duration": 10,
                "avoid_night_driving": False,
            }
        }


class RoutePlanningRequest(BaseModel):
    """Request schema for route planning optimization."""

    driver_id: str = Field(..., description="Driver identifier", min_length=1)
    vehicle_id: str = Field(..., description="Vehicle identifier", min_length=1)

    driver_state: DriverStateInput = Field(..., description="Current HOS state")
    vehicle_state: VehicleStateInput = Field(..., description="Current vehicle state")
    stops: List[StopInput] = Field(..., description="List of stops to visit", min_length=2)

    optimization_priority: str = Field(
        default="minimize_time",
        description="Optimization goal",
        pattern="^(minimize_time|minimize_cost|balance)$",
    )

    driver_preferences: Optional[DriverPreferencesInput] = Field(
        None, description="Driver preferences"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "driver_id": "DRV-12345",
                "vehicle_id": "VEH-987",
                "driver_state": {
                    "hours_driven": 5.5,
                    "on_duty_time": 6.0,
                    "hours_since_break": 5.0,
                },
                "vehicle_state": {
                    "fuel_capacity_gallons": 200.0,
                    "current_fuel_gallons": 120.0,
                    "mpg": 6.5,
                },
                "stops": [
                    {
                        "stop_id": "stop_001",
                        "name": "Origin Warehouse",
                        "lat": 41.8781,
                        "lon": -87.6298,
                        "location_type": "warehouse",
                        "is_origin": True,
                        "estimated_dock_hours": 1.0,
                    },
                    {
                        "stop_id": "stop_002",
                        "name": "Customer A",
                        "lat": 42.3601,
                        "lon": -71.0589,
                        "location_type": "customer",
                        "estimated_dock_hours": 2.0,
                        "customer_name": "ABC Corp",
                    },
                    {
                        "stop_id": "stop_003",
                        "name": "Destination",
                        "lat": 40.7128,
                        "lon": -74.0060,
                        "location_type": "warehouse",
                        "is_destination": True,
                        "estimated_dock_hours": 1.5,
                    },
                ],
                "optimization_priority": "minimize_time",
            }
        }


class RouteUpdateRequest(BaseModel):
    """Request schema for dynamic route updates."""

    plan_id: str = Field(..., description="Route plan ID to update")

    update_type: str = Field(
        ...,
        description="Type of update",
        pattern="^(traffic_delay|dock_time_change|load_added|load_cancelled|driver_rest_request|hos_violation)$",
    )

    # Update-specific data
    segment_id: Optional[str] = Field(None, description="Segment ID affected (for traffic/dock)")
    delay_minutes: Optional[int] = Field(None, description="Delay in minutes (for traffic)")
    actual_dock_hours: Optional[float] = Field(None, description="Actual dock time (for dock_time_change)")

    # For load added
    new_stop: Optional[StopInput] = Field(None, description="New stop to add (for load_added)")

    # For load cancelled
    cancelled_stop_id: Optional[str] = Field(None, description="Stop ID to remove (for load_cancelled)")

    # For driver rest request
    rest_location: Optional[dict] = Field(None, description="Preferred rest location (for driver_rest_request)")

    triggered_by: str = Field(default="system", description="Who triggered the update (system/driver/dispatcher)")

    class Config:
        json_schema_extra = {
            "example": {
                "plan_id": "plan_123",
                "update_type": "dock_time_change",
                "segment_id": "seg_456",
                "actual_dock_hours": 4.0,
                "triggered_by": "driver",
            }
        }
