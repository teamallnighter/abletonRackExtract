"""
Security utilities for enhanced password validation and email validation
"""

import re
from typing import Tuple, bool

def validate_password(password: str) -> Tuple[bool, str]:
    """
    Validate password strength with enhanced requirements
    
    Returns:
        Tuple[bool, str]: (is_valid, error_message)
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter"
    
    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter"
    
    if not re.search(r"\d", password):
        return False, "Password must contain at least one number"
    
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        return False, "Password must contain at least one special character"
    
    # Check for common weak passwords
    weak_passwords = [
        "password", "12345678", "qwerty", "abc123", "password123",
        "admin", "letmein", "welcome", "monkey", "dragon"
    ]
    
    if password.lower() in weak_passwords:
        return False, "This password is too common. Please choose a stronger password"
    
    return True, ""

def validate_email(email: str) -> Tuple[bool, str]:
    """
    Validate email format with enhanced checking
    
    Returns:
        Tuple[bool, str]: (is_valid, error_message)
    """
    # Basic email regex pattern
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    
    if not re.match(pattern, email):
        return False, "Invalid email format"
    
    # Check for common disposable email domains
    disposable_domains = [
        "tempmail.com", "throwaway.email", "guerillamail.com",
        "mailinator.com", "10minutemail.com", "trashmail.com"
    ]
    
    domain = email.split('@')[1].lower()
    if domain in disposable_domains:
        return False, "Disposable email addresses are not allowed"
    
    return True, ""

def sanitize_username(username: str) -> str:
    """
    Sanitize username to prevent injection attacks
    """
    # Remove any non-alphanumeric characters except underscore and hyphen
    sanitized = re.sub(r'[^a-zA-Z0-9_-]', '', username)
    
    # Limit length
    return sanitized[:30]
