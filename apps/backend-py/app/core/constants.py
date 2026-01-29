"""FMCSA Hours of Service (HOS) constants and regulations."""

from enum import Enum


class DutyStatus(str, Enum):
    """Driver duty status enumeration."""

    OFF_DUTY = "off_duty"
    SLEEPER_BERTH = "sleeper_berth"
    DRIVING = "driving"
    ON_DUTY_NOT_DRIVING = "on_duty_not_driving"


class RestRecommendation(str, Enum):
    """Rest recommendation types."""

    FULL_REST = "full_rest"  # Take complete 10-hour sleeper berth rest
    PARTIAL_REST_7_3 = "partial_rest_7_3"  # Take 7/3 split sleeper berth rest
    PARTIAL_REST_8_2 = "partial_rest_8_2"  # Take 8/2 split sleeper berth rest
    BREAK = "break"  # Take 30-minute break
    NO_REST = "no_rest"  # Continue without rest


class ComplianceStatus(str, Enum):
    """HOS compliance status."""

    COMPLIANT = "compliant"
    NON_COMPLIANT = "non_compliant"
    WARNING = "warning"  # Approaching limits


# FMCSA Hours of Service Limits (11-hour/14-hour rule)
# These are loaded from settings, but defined as constants for type checking
MAX_DRIVE_HOURS = 11.0  # Maximum driving time in hours
MAX_DUTY_HOURS = 14.0  # Maximum on-duty time in hours (including driving)
REQUIRED_BREAK_MINUTES = 30  # Required break duration after 8 hours driving
BREAK_TRIGGER_HOURS = 8.0  # Hours of driving before break is required
MIN_REST_HOURS = 10.0  # Minimum off-duty/sleeper berth time to reset hours

# Sleeper Berth Split Provisions
SLEEPER_BERTH_SPLIT_LONG = 8.0  # Long split sleeper berth period
SLEEPER_BERTH_SPLIT_SHORT = 2.0  # Short split sleeper berth period
SLEEPER_BERTH_SPLIT_ALT_LONG = 7.0  # Alternative long split (7/3 split)
SLEEPER_BERTH_SPLIT_ALT_SHORT = 3.0  # Alternative short split (7/3 split)

# Named constants for clarity
SLEEPER_BERTH_SPLIT_7_3_LONG = 7.0  # 7/3 split - long period
SLEEPER_BERTH_SPLIT_7_3_SHORT = 3.0  # 7/3 split - short period
SLEEPER_BERTH_SPLIT_8_2_LONG = 8.0  # 8/2 split - long period
SLEEPER_BERTH_SPLIT_8_2_SHORT = 2.0  # 8/2 split - short period

# Warning thresholds (hours remaining before limit)
WARNING_THRESHOLD_HOURS = 1.0  # Warn when less than 1 hour remaining

# Dock time thresholds for optimization
MIN_DOCK_TIME_FOR_FULL_REST = 10.0  # Minimum dock time to recommend full rest
MIN_DOCK_TIME_FOR_PARTIAL_REST = 7.0  # Minimum dock time for partial rest
MIN_DOCK_TIME_FOR_7H_SPLIT = 7.0  # Minimum dock time for 7/3 split
MIN_DOCK_TIME_FOR_8H_SPLIT = 8.0  # Minimum dock time for 8/2 split

# Drive demand thresholds (hours)
LOW_DRIVE_DEMAND_THRESHOLD = 3.0  # If post-load drive < 3 hours, consider it low demand
HIGH_DRIVE_DEMAND_THRESHOLD = 8.0  # If post-load drive > 8 hours, high demand
