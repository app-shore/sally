"""Custom application exceptions."""


class SallyException(Exception):
    """Base exception for SALLY application."""

    def __init__(self, message: str, code: str | None = None) -> None:
        self.message = message
        self.code = code or "SALLY_ERROR"
        super().__init__(self.message)


class HOSComplianceError(SallyException):
    """Raised when HOS compliance validation fails."""

    def __init__(self, message: str) -> None:
        super().__init__(message, code="HOS_COMPLIANCE_ERROR")


class OptimizationError(SallyException):
    """Raised when rest optimization fails."""

    def __init__(self, message: str) -> None:
        super().__init__(message, code="OPTIMIZATION_ERROR")


class PredictionError(SallyException):
    """Raised when prediction fails."""

    def __init__(self, message: str) -> None:
        super().__init__(message, code="PREDICTION_ERROR")


class DatabaseError(SallyException):
    """Raised when database operation fails."""

    def __init__(self, message: str) -> None:
        super().__init__(message, code="DATABASE_ERROR")


class ValidationError(SallyException):
    """Raised when input validation fails."""

    def __init__(self, message: str) -> None:
        super().__init__(message, code="VALIDATION_ERROR")


class NotFoundError(SallyException):
    """Raised when a resource is not found."""

    def __init__(self, resource: str, identifier: str | int) -> None:
        message = f"{resource} with identifier '{identifier}' not found"
        super().__init__(message, code="NOT_FOUND")
