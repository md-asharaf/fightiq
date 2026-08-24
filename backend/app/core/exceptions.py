class DomainError(Exception):
    """Base exception for all domain-level errors."""

    pass


class ResourceNotFoundError(DomainError):
    """Raised when a requested resource is not found."""

    def __init__(self, message: str):
        self.message = message
        super().__init__(self.message)


class ValidationError(DomainError):
    """Raised when a business validation rule fails."""

    def __init__(self, message: str):
        self.message = message
        super().__init__(self.message)
