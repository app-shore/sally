"""Custom validators for application data."""

from datetime import datetime, timezone


def validate_positive(value: float, field_name: str = "value") -> None:
    """Validate that a value is positive."""
    if value < 0:
        raise ValueError(f"{field_name} must be positive, got {value}")


def validate_range(
    value: float, min_value: float, max_value: float, field_name: str = "value"
) -> None:
    """Validate that a value is within a range."""
    if not min_value <= value <= max_value:
        raise ValueError(
            f"{field_name} must be between {min_value} and {max_value}, got {value}"
        )


def validate_percentage(value: float, field_name: str = "value") -> None:
    """Validate that a value is a valid percentage (0-100)."""
    validate_range(value, 0.0, 100.0, field_name)


def validate_hours(value: float, field_name: str = "hours") -> None:
    """Validate that hours value is reasonable (0-24)."""
    validate_range(value, 0.0, 24.0, field_name)


def validate_future_datetime(dt: datetime, field_name: str = "datetime") -> None:
    """Validate that a datetime is in the future."""
    now = datetime.now(timezone.utc)
    if dt <= now:
        raise ValueError(f"{field_name} must be in the future, got {dt}")


def validate_past_datetime(dt: datetime, field_name: str = "datetime") -> None:
    """Validate that a datetime is in the past."""
    now = datetime.now(timezone.utc)
    if dt >= now:
        raise ValueError(f"{field_name} must be in the past, got {dt}")
