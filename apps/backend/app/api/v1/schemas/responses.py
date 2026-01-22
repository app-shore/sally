"""Response schemas for API endpoints."""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class ComplianceCheckDetail(BaseModel):
    """Individual compliance check detail."""

    rule_name: str = Field(..., description="Name of the HOS rule")
    is_compliant: bool = Field(..., description="Whether the rule is satisfied")
    current_value: float = Field(..., description="Current value for this rule")
    limit_value: float = Field(..., description="Limit value for this rule")
    remaining: float = Field(..., description="Remaining hours before limit")
    message: str = Field(..., description="Human-readable status message")


class HOSCheckResponse(BaseModel):
    """Response schema for HOS compliance check."""

    status: str = Field(..., description="Overall compliance status (compliant, non_compliant, warning)")
    is_compliant: bool = Field(..., description="Overall compliance flag")
    checks: List[ComplianceCheckDetail] = Field(..., description="Individual compliance checks")
    warnings: List[str] = Field(default=[], description="Warning messages")
    violations: List[str] = Field(default=[], description="Violation messages")
    hours_remaining_to_drive: float = Field(..., description="Hours remaining before drive limit")
    hours_remaining_on_duty: float = Field(..., description="Hours remaining before duty limit")
    break_required: bool = Field(..., description="Whether 30-min break is required")
    rest_required: bool = Field(..., description="Whether full rest period is required")

    class Config:
        json_schema_extra = {
            "example": {
                "status": "compliant",
                "is_compliant": True,
                "checks": [
                    {
                        "rule_name": "11-hour driving limit",
                        "is_compliant": True,
                        "current_value": 9.5,
                        "limit_value": 11.0,
                        "remaining": 1.5,
                        "message": "Within 11-hour drive limit (1.5h remaining)",
                    }
                ],
                "warnings": [],
                "violations": [],
                "hours_remaining_to_drive": 1.5,
                "hours_remaining_on_duty": 3.0,
                "break_required": False,
                "rest_required": False,
            }
        }


class OptimizationResponse(BaseModel):
    """Response schema for rest optimization recommendation."""

    recommendation: str = Field(..., description="Rest recommendation (full_rest, partial_rest, no_rest)")
    recommended_duration_hours: Optional[float] = Field(None, description="Recommended rest duration in hours")
    reasoning: str = Field(..., description="Explanation of the recommendation")

    # Compliance information
    is_compliant: bool = Field(..., description="Current HOS compliance status")
    compliance_details: str = Field(..., description="Compliance check details")
    hours_remaining_to_drive: float = Field(..., description="Hours remaining before drive limit")
    hours_remaining_on_duty: float = Field(..., description="Hours remaining before duty limit")

    # Feasibility check
    post_load_drive_feasible: bool = Field(..., description="Whether post-load drive is feasible after rest")

    class Config:
        json_schema_extra = {
            "example": {
                "recommendation": "full_rest",
                "recommended_duration_hours": 10.0,
                "reasoning": "Full 10-hour rest recommended. Dock time (12.0h) is sufficient and post-load drive demand is low (2.7h). This maximizes productive driving hours for next shift.",
                "is_compliant": True,
                "compliance_details": "Within 11-hour drive limit (2.5h remaining); Within 14-hour duty window (4.0h remaining); 30-minute break not yet required (2.0h until required)",
                "hours_remaining_to_drive": 2.5,
                "hours_remaining_on_duty": 4.0,
                "post_load_drive_feasible": True,
            }
        }


class PredictionResponse(BaseModel):
    """Response schema for drive demand prediction."""

    estimated_drive_hours: float = Field(..., description="Estimated driving hours required")
    estimated_arrival_time: Optional[datetime] = Field(None, description="Estimated arrival time")
    is_high_demand: bool = Field(..., description="Whether this is classified as high demand (>8h)")
    is_low_demand: bool = Field(..., description="Whether this is classified as low demand (<3h)")
    confidence: float = Field(..., description="Prediction confidence score (0-1)", ge=0, le=1)
    reasoning: str = Field(..., description="Explanation of the prediction")

    class Config:
        json_schema_extra = {
            "example": {
                "estimated_drive_hours": 7.5,
                "estimated_arrival_time": "2026-01-23T14:30:00Z",
                "is_high_demand": False,
                "is_low_demand": False,
                "confidence": 0.7,
                "reasoning": "Estimated 7.5 hours of driving to cover 450.0 miles. This is considered MODERATE demand, requiring balanced rest and driving strategy.",
            }
        }
