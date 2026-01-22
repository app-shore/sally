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


class FeasibilityAnalysisResponse(BaseModel):
    """Feasibility analysis details."""

    feasible: bool = Field(..., description="Can complete trips with current hours")
    limiting_factor: Optional[str] = Field(None, description="Limiting constraint (drive_limit, duty_window, or None)")
    shortfall_hours: float = Field(..., description="Hours short (0 if feasible)")
    total_drive_needed: float = Field(..., description="Total driving hours needed for trips")
    total_on_duty_needed: float = Field(..., description="Total on-duty hours needed for trips")
    will_need_break: bool = Field(..., description="Whether break will be required during trips")
    drive_margin: float = Field(..., description="Extra drive hours after completing trips")
    duty_margin: float = Field(..., description="Extra duty hours after completing trips")


class OpportunityAnalysisResponse(BaseModel):
    """Rest opportunity scoring analysis."""

    score: float = Field(..., description="Overall opportunity score (0-100)")
    dock_score: float = Field(..., description="Dock time availability score")
    hours_score: float = Field(..., description="Hours gainable score")
    criticality_score: float = Field(..., description="Current hours criticality score")
    dock_time_available: float = Field(..., description="Dock time available (hours)")
    hours_gainable: float = Field(..., description="Hours driver would gain from rest")


class CostAnalysisResponse(BaseModel):
    """Rest extension cost analysis."""

    full_rest_extension_hours: float = Field(..., description="Additional hours needed for full rest")
    partial_rest_extension_hours: float = Field(..., description="Additional hours needed for partial rest")
    dock_time_available: float = Field(..., description="Current dock time available (hours)")


class OptimizationResponse(BaseModel):
    """Response schema for intelligent rest optimization recommendation."""

    # Core recommendation
    recommendation: str = Field(..., description="Rest recommendation (full_rest, partial_rest, no_rest)")
    recommended_duration_hours: Optional[float] = Field(None, description="Recommended rest duration in hours")
    reasoning: str = Field(..., description="Detailed explanation of the recommendation")
    confidence: int = Field(..., description="Confidence level (0-100)", ge=0, le=100)

    # Compliance information
    is_compliant: bool = Field(..., description="Current HOS compliance status")
    compliance_details: str = Field(..., description="Compliance check details")
    hours_remaining_to_drive: float = Field(..., description="Hours remaining before drive limit")
    hours_remaining_on_duty: float = Field(..., description="Hours remaining before duty limit")

    # Feasibility check
    post_load_drive_feasible: bool = Field(..., description="Whether post-load drive is feasible after rest")
    driver_can_decline: bool = Field(..., description="Whether driver can decline this recommendation")

    # Enhanced analytics (optional - included when intelligent optimization used)
    feasibility_analysis: Optional[FeasibilityAnalysisResponse] = Field(None, description="Trip feasibility analysis")
    opportunity_analysis: Optional[OpportunityAnalysisResponse] = Field(None, description="Rest opportunity scoring")
    cost_analysis: Optional[CostAnalysisResponse] = Field(None, description="Rest extension cost analysis")

    # Before/after comparison
    hours_after_rest_drive: Optional[float] = Field(None, description="Drive hours available after recommended rest")
    hours_after_rest_duty: Optional[float] = Field(None, description="Duty hours available after recommended rest")

    class Config:
        json_schema_extra = {
            "example": {
                "recommendation": "full_rest",
                "recommended_duration_hours": 10.0,
                "reasoning": "Trip not feasible with current hours. Shortfall: 0.5h (drive_limit). Extending dock time (2.0h) to full 10h rest will reset all hours and enable trip completion.",
                "confidence": 100,
                "is_compliant": True,
                "compliance_details": "Within 11-hour drive limit (3.0h remaining); Within 14-hour duty window (7.0h remaining); 30-minute break not yet required (2.0h until required)",
                "hours_remaining_to_drive": 3.0,
                "hours_remaining_on_duty": 7.0,
                "post_load_drive_feasible": True,
                "driver_can_decline": False,
                "feasibility_analysis": {
                    "feasible": False,
                    "limiting_factor": "drive_limit",
                    "shortfall_hours": 0.5,
                    "total_drive_needed": 3.5,
                    "total_on_duty_needed": 6.5,
                    "will_need_break": False,
                    "drive_margin": -0.5,
                    "duty_margin": 0.5,
                },
                "opportunity_analysis": {
                    "score": 62.0,
                    "dock_score": 10.0,
                    "hours_score": 21.8,
                    "criticality_score": 30.0,
                    "dock_time_available": 2.0,
                    "hours_gainable": 8.0,
                },
                "cost_analysis": {
                    "full_rest_extension_hours": 8.0,
                    "partial_rest_extension_hours": 5.0,
                    "dock_time_available": 2.0,
                },
                "hours_after_rest_drive": 11.0,
                "hours_after_rest_duty": 14.0,
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
