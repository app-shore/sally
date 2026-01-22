"""Custom application exceptions."""


class RestOSException(Exception):
    """Base exception for REST-OS application."""

    def __init__(self, message: str, code: str | None = None) -> None:
        self.message = message
        self.code = code or "RESTOS_ERROR"
        super().__init__(self.message)


class HOSComplianceError(RestOSException):
    """Raised when HOS compliance validation fails."""

    def __init__(self, message: str) -> None:
        super().__init__(message, code="HOS_COMPLIANCE_ERROR")


class OptimizationError(RestOSException):
    """Raised when rest optimization fails."""

    def __init__(self, message: str) -> None:
        super().__init__(message, code="OPTIMIZATION_ERROR")


class PredictionError(RestOSException):
    """Raised when prediction fails."""

    def __init__(self, message: str) -> None:
        super().__init__(message, code="PREDICTION_ERROR")


class DatabaseError(RestOSException):
    """Raised when database operation fails."""

    def __init__(self, message: str) -> None:
        super().__init__(message, code="DATABASE_ERROR")


class ValidationError(RestOSException):
    """Raised when input validation fails."""

    def __init__(self, message: str) -> None:
        super().__init__(message, code="VALIDATION_ERROR")


class NotFoundError(RestOSException):
    """Raised when a resource is not found."""

    def __init__(self, resource: str, identifier: str | int) -> None:
        message = f"{resource} with identifier '{identifier}' not found"
        super().__init__(message, code="NOT_FOUND")
