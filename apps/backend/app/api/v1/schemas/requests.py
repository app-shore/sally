"""Request schemas for API endpoints."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class HOSCheckRequest(BaseModel):
    """Request schema for HOS compliance check."""

    driver_id: str = Field(..., description="Driver identifier", min_length=1)
    hours_driven: float = Field(..., description="Hours driven in current duty period", ge=0, le=24)
    on_duty_time: float = Field(..., description="Total on-duty time in current period", ge=0, le=24)
    hours_since_break: float = Field(..., description="Hours driven since last break", ge=0, le=24)
    last_rest_period: Optional[float] = Field(None, description="Last rest period duration in hours", ge=0)

    class Config:
        json_schema_extra = {
            "example": {
                "driver_id": "DRV-12345",
                "hours_driven": 9.5,
                "on_duty_time": 11.0,
                "hours_since_break": 7.5,
                "last_rest_period": 10.0,
            }
        }


class OptimizationRequest(BaseModel):
    """Request schema for rest optimization recommendation."""

    driver_id: str = Field(..., description="Driver identifier", min_length=1)
    hours_driven: float = Field(..., description="Hours driven in current duty period", ge=0, le=24)
    on_duty_time: float = Field(..., description="Total on-duty time in current period", ge=0, le=24)
    hours_since_break: float = Field(..., description="Hours driven since last break", ge=0, le=24)

    # Dock information
    dock_duration_hours: Optional[float] = Field(None, description="Expected or actual dock duration in hours", ge=0)
    dock_location: Optional[str] = Field(None, description="Dock location")

    # Route information
    remaining_distance_miles: Optional[float] = Field(None, description="Remaining route distance in miles", ge=0)
    destination: Optional[str] = Field(None, description="Destination location")
    appointment_time: Optional[datetime] = Field(None, description="Appointment time at destination")

    # Current status
    current_location: Optional[str] = Field(None, description="Current location")

    class Config:
        json_schema_extra = {
            "example": {
                "driver_id": "DRV-12345",
                "hours_driven": 8.5,
                "on_duty_time": 10.0,
                "hours_since_break": 6.0,
                "dock_duration_hours": 12.0,
                "dock_location": "Atlanta Distribution Center",
                "remaining_distance_miles": 150.0,
                "destination": "Miami, FL",
                "appointment_time": "2026-01-23T08:00:00Z",
                "current_location": "Atlanta, GA",
            }
        }


class PredictionRequest(BaseModel):
    """Request schema for drive demand prediction."""

    remaining_distance_miles: float = Field(..., description="Remaining distance in miles", gt=0)
    destination: str = Field(..., description="Destination location", min_length=1)
    appointment_time: Optional[datetime] = Field(None, description="Appointment time at destination")
    current_location: Optional[str] = Field(None, description="Current location")
    average_speed_mph: float = Field(default=55.0, description="Average driving speed in mph", gt=0, le=100)

    class Config:
        json_schema_extra = {
            "example": {
                "remaining_distance_miles": 450.0,
                "destination": "Chicago, IL",
                "appointment_time": "2026-01-23T14:00:00Z",
                "current_location": "Indianapolis, IN",
                "average_speed_mph": 60.0,
            }
        }
