"""HOS (Hours of Service) Rule Engine for FMCSA compliance validation."""

from dataclasses import dataclass
from typing import List

from app.config import settings
from app.core.constants import ComplianceStatus
from app.core.exceptions import HOSComplianceError
from app.utils.logger import get_logger
from app.utils.validators import validate_hours, validate_positive

logger = get_logger(__name__)


@dataclass
class ComplianceCheck:
    """Individual compliance check result."""

    rule_name: str
    is_compliant: bool
    current_value: float
    limit_value: float
    remaining: float
    message: str


@dataclass
class HOSComplianceResult:
    """Complete HOS compliance validation result."""

    status: ComplianceStatus
    is_compliant: bool
    checks: List[ComplianceCheck]
    warnings: List[str]
    violations: List[str]
    hours_remaining_to_drive: float
    hours_remaining_on_duty: float
    break_required: bool
    rest_required: bool


class HOSRuleEngine:
    """
    HOS Rule Engine for validating FMCSA Hours of Service compliance.

    Implements the following rules:
    - 11-hour driving limit
    - 14-hour on-duty window
    - 30-minute break after 8 hours of driving
    - 10-hour minimum rest period
    """

    def __init__(self) -> None:
        """Initialize HOS Rule Engine with configuration settings."""
        self.max_drive_hours = settings.max_drive_hours
        self.max_duty_hours = settings.max_duty_hours
        self.required_break_minutes = settings.required_break_minutes
        self.break_trigger_hours = settings.break_trigger_hours
        self.min_rest_hours = settings.min_rest_hours

    def validate_compliance(
        self,
        hours_driven: float,
        on_duty_time: float,
        hours_since_break: float,
        last_rest_period: float | None = None,
    ) -> HOSComplianceResult:
        """
        Validate HOS compliance for a driver.

        Args:
            hours_driven: Hours driven in current duty period
            on_duty_time: Total on-duty time in current duty period
            hours_since_break: Hours driven since last 30-min break
            last_rest_period: Last rest period duration (hours)

        Returns:
            HOSComplianceResult with detailed compliance status

        Raises:
            ValueError: If input values are invalid
        """
        # Validate inputs
        try:
            validate_hours(hours_driven, "hours_driven")
            validate_hours(on_duty_time, "on_duty_time")
            validate_hours(hours_since_break, "hours_since_break")
            validate_positive(hours_driven, "hours_driven")
            validate_positive(on_duty_time, "on_duty_time")
            validate_positive(hours_since_break, "hours_since_break")
        except ValueError as e:
            logger.error("hos_validation_input_error", error=str(e))
            raise

        logger.info(
            "hos_compliance_check_started",
            hours_driven=hours_driven,
            on_duty_time=on_duty_time,
            hours_since_break=hours_since_break,
        )

        checks: List[ComplianceCheck] = []
        warnings: List[str] = []
        violations: List[str] = []

        # Check 1: 11-hour driving limit
        drive_check = self._check_drive_limit(hours_driven)
        checks.append(drive_check)
        if not drive_check.is_compliant:
            violations.append(drive_check.message)
        elif drive_check.remaining <= 1.0:
            warnings.append(f"Warning: {drive_check.message}")

        # Check 2: 14-hour on-duty window
        duty_check = self._check_duty_limit(on_duty_time)
        checks.append(duty_check)
        if not duty_check.is_compliant:
            violations.append(duty_check.message)
        elif duty_check.remaining <= 1.0:
            warnings.append(f"Warning: {duty_check.message}")

        # Check 3: 30-minute break requirement
        break_check = self._check_break_requirement(hours_since_break)
        checks.append(break_check)
        if not break_check.is_compliant:
            violations.append(break_check.message)

        # Determine overall compliance status
        is_compliant = all(check.is_compliant for check in checks)

        if not is_compliant:
            status = ComplianceStatus.NON_COMPLIANT
        elif warnings:
            status = ComplianceStatus.WARNING
        else:
            status = ComplianceStatus.COMPLIANT

        # Calculate remaining hours
        hours_remaining_to_drive = max(0, self.max_drive_hours - hours_driven)
        hours_remaining_on_duty = max(0, self.max_duty_hours - on_duty_time)

        # Determine if break or rest is required
        break_required = hours_since_break >= self.break_trigger_hours
        rest_required = (
            hours_driven >= self.max_drive_hours or on_duty_time >= self.max_duty_hours
        )

        result = HOSComplianceResult(
            status=status,
            is_compliant=is_compliant,
            checks=checks,
            warnings=warnings,
            violations=violations,
            hours_remaining_to_drive=hours_remaining_to_drive,
            hours_remaining_on_duty=hours_remaining_on_duty,
            break_required=break_required,
            rest_required=rest_required,
        )

        logger.info(
            "hos_compliance_check_completed",
            status=status.value,
            is_compliant=is_compliant,
            violations_count=len(violations),
            warnings_count=len(warnings),
        )

        return result

    def _check_drive_limit(self, hours_driven: float) -> ComplianceCheck:
        """Check 11-hour driving limit."""
        remaining = self.max_drive_hours - hours_driven
        is_compliant = hours_driven <= self.max_drive_hours

        if is_compliant:
            if remaining <= 1.0:
                message = f"Approaching 11-hour drive limit ({remaining:.1f}h remaining)"
            else:
                message = f"Within 11-hour drive limit ({remaining:.1f}h remaining)"
        else:
            message = f"Exceeded 11-hour drive limit by {abs(remaining):.1f}h"

        return ComplianceCheck(
            rule_name="11-hour driving limit",
            is_compliant=is_compliant,
            current_value=hours_driven,
            limit_value=self.max_drive_hours,
            remaining=max(0, remaining),
            message=message,
        )

    def _check_duty_limit(self, on_duty_time: float) -> ComplianceCheck:
        """Check 14-hour on-duty window."""
        remaining = self.max_duty_hours - on_duty_time
        is_compliant = on_duty_time <= self.max_duty_hours

        if is_compliant:
            if remaining <= 1.0:
                message = f"Approaching 14-hour duty window ({remaining:.1f}h remaining)"
            else:
                message = f"Within 14-hour duty window ({remaining:.1f}h remaining)"
        else:
            message = f"Exceeded 14-hour duty window by {abs(remaining):.1f}h"

        return ComplianceCheck(
            rule_name="14-hour on-duty window",
            is_compliant=is_compliant,
            current_value=on_duty_time,
            limit_value=self.max_duty_hours,
            remaining=max(0, remaining),
            message=message,
        )

    def _check_break_requirement(self, hours_since_break: float) -> ComplianceCheck:
        """Check 30-minute break after 8 hours of driving."""
        remaining = self.break_trigger_hours - hours_since_break
        is_compliant = hours_since_break < self.break_trigger_hours

        if is_compliant:
            message = f"30-minute break not yet required ({remaining:.1f}h until required)"
        else:
            message = (
                f"30-minute break required (driven {hours_since_break:.1f}h without break)"
            )

        return ComplianceCheck(
            rule_name="30-minute break after 8 hours",
            is_compliant=is_compliant,
            current_value=hours_since_break,
            limit_value=self.break_trigger_hours,
            remaining=max(0, remaining),
            message=message,
        )

    def can_drive(
        self,
        hours_driven: float,
        on_duty_time: float,
        hours_since_break: float,
    ) -> bool:
        """
        Check if driver can legally continue driving.

        Args:
            hours_driven: Hours driven in current duty period
            on_duty_time: Total on-duty time in current duty period
            hours_since_break: Hours driven since last 30-min break

        Returns:
            bool: True if driver can continue driving, False otherwise
        """
        result = self.validate_compliance(hours_driven, on_duty_time, hours_since_break)
        return result.is_compliant and not result.rest_required

    def hours_until_rest_required(
        self,
        hours_driven: float,
        on_duty_time: float,
    ) -> float:
        """
        Calculate hours until rest is required.

        Returns the minimum of remaining drive hours and remaining duty hours.

        Args:
            hours_driven: Hours driven in current duty period
            on_duty_time: Total on-duty time in current duty period

        Returns:
            float: Hours until rest is required
        """
        hours_until_drive_limit = max(0, self.max_drive_hours - hours_driven)
        hours_until_duty_limit = max(0, self.max_duty_hours - on_duty_time)

        return min(hours_until_drive_limit, hours_until_duty_limit)
