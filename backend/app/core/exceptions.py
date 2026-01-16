"""Custom exceptions for the Bayit Plus application."""


class GameError(Exception):
    """Raised when a game operation fails"""
    pass


class FriendshipError(Exception):
    """Raised when friendship operation fails"""
    pass
