"""Tests for HOS Rule Engine."""

import pytest

from app.core.constants import ComplianceStatus
from app.services.hos_rule_engine import HOSRuleEngine


class TestHOSRuleEngine:
    """Test cases for HOS Rule Engine."""

    def test_compliant_status(self):
        """Test compliant driver status."""
        engine = HOSRuleEngine()
        result = engine.validate_compliance(
            hours_driven=5.0, on_duty_time=7.0, hours_since_break=4.0
        )

        assert result.is_compliant is True
        assert result.status == ComplianceStatus.COMPLIANT
        assert len(result.violations) == 0
        assert result.hours_remaining_to_drive == 6.0
        assert result.break_required is False
        assert result.rest_required is False

    def test_drive_limit_exceeded(self):
        """Test 11-hour drive limit exceeded."""
        engine = HOSRuleEngine()
        result = engine.validate_compliance(
            hours_driven=12.0, on_duty_time=13.0, hours_since_break=12.0
        )

        assert result.is_compliant is False
        assert result.status == ComplianceStatus.NON_COMPLIANT
        assert len(result.violations) > 0
        assert result.hours_remaining_to_drive == 0
        assert result.rest_required is True

    def test_duty_limit_exceeded(self):
        """Test 14-hour duty window exceeded."""
        engine = HOSRuleEngine()
        result = engine.validate_compliance(
            hours_driven=10.0, on_duty_time=15.0, hours_since_break=10.0
        )

        assert result.is_compliant is False
        assert result.status == ComplianceStatus.NON_COMPLIANT
        assert len(result.violations) > 0
        assert result.rest_required is True

    def test_break_required(self):
        """Test 30-minute break requirement."""
        engine = HOSRuleEngine()
        result = engine.validate_compliance(
            hours_driven=9.0, on_duty_time=10.0, hours_since_break=8.5
        )

        assert result.is_compliant is False
        assert result.status == ComplianceStatus.NON_COMPLIANT
        assert result.break_required is True
        assert "30-minute break required" in result.violations[0]

    def test_warning_status(self):
        """Test warning when approaching limits."""
        engine = HOSRuleEngine()
        result = engine.validate_compliance(
            hours_driven=10.5, on_duty_time=12.0, hours_since_break=6.0
        )

        assert result.is_compliant is True
        assert result.status == ComplianceStatus.WARNING
        assert len(result.warnings) > 0
        assert result.hours_remaining_to_drive == 0.5

    def test_can_drive_method(self):
        """Test can_drive convenience method."""
        engine = HOSRuleEngine()

        # Can drive
        assert engine.can_drive(5.0, 7.0, 4.0) is True

        # Cannot drive (exceeded limit)
        assert engine.can_drive(12.0, 13.0, 12.0) is False

    def test_hours_until_rest_required(self):
        """Test hours until rest calculation."""
        engine = HOSRuleEngine()

        # 6 hours of driving remaining, 7 hours of duty remaining
        hours_until_rest = engine.hours_until_rest_required(5.0, 7.0)
        assert hours_until_rest == 6.0

        # 1 hour of driving remaining, 2 hours of duty remaining
        hours_until_rest = engine.hours_until_rest_required(10.0, 12.0)
        assert hours_until_rest == 1.0

    def test_invalid_input_negative(self):
        """Test validation of negative input values."""
        engine = HOSRuleEngine()

        with pytest.raises(ValueError):
            engine.validate_compliance(-1.0, 5.0, 3.0)

    def test_invalid_input_out_of_range(self):
        """Test validation of out-of-range input values."""
        engine = HOSRuleEngine()

        with pytest.raises(ValueError):
            engine.validate_compliance(25.0, 5.0, 3.0)
