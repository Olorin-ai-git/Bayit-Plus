"""
Password Validation Module
Enforces strong password requirements and checks against common passwords
"""

import re
from typing import Optional

# Top 100 most common passwords (subset for demonstration)
COMMON_PASSWORDS = {
    "password", "123456", "12345678", "qwerty", "abc123", "monkey",
    "1234567", "letmein", "trustno1", "dragon", "baseball", "iloveyou",
    "master", "sunshine", "ashley", "bailey", "passw0rd", "shadow",
    "123123", "654321", "superman", "qazwsx", "michael", "football",
    "password1", "welcome", "jesus", "ninja", "mustang", "password123",
    "admin", "administrator", "root", "toor", "pass", "test",
}


def validate_password_strength(password: str) -> Optional[str]:
    """
    Validate password meets security requirements.

    Requirements:
    - Minimum 12 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one digit
    - At least one special character
    - Not in common passwords list

    Args:
        password: Password string to validate

    Returns:
        Error message if invalid, None if valid
    """
    if len(password) < 12:
        return "Password must be at least 12 characters long"

    if not re.search(r'[A-Z]', password):
        return "Password must contain at least one uppercase letter"

    if not re.search(r'[a-z]', password):
        return "Password must contain at least one lowercase letter"

    if not re.search(r'\d', password):
        return "Password must contain at least one digit"

    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return "Password must contain at least one special character (!@#$%^&*(),.?\":{}|<>)"

    if password.lower() in COMMON_PASSWORDS:
        return "Password is too common. Please choose a more unique password"

    return None


def get_password_strength_score(password: str) -> int:
    """
    Calculate password strength score (0-100).

    Args:
        password: Password to score

    Returns:
        Score from 0 (weak) to 100 (strong)
    """
    score = 0

    # Length score (up to 40 points)
    if len(password) >= 8:
        score += 10
    if len(password) >= 12:
        score += 10
    if len(password) >= 16:
        score += 10
    if len(password) >= 20:
        score += 10

    # Character diversity (up to 40 points)
    if re.search(r'[a-z]', password):
        score += 10
    if re.search(r'[A-Z]', password):
        score += 10
    if re.search(r'\d', password):
        score += 10
    if re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        score += 10

    # Complexity bonus (up to 20 points)
    if len(set(password)) > len(password) * 0.7:
        score += 10
    if not password.lower() in COMMON_PASSWORDS:
        score += 10

    return min(score, 100)
