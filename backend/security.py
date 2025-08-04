"""
Security utilities for enhanced password validation and email validation
"""

import re
from typing import Tuple

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

def sanitize_input(text: str) -> str:
    """
    Sanitize general text input to prevent XSS and injection attacks
    """
    if not isinstance(text, str):
        return str(text)
    
    # Remove HTML tags and potentially dangerous characters
    # Keep basic punctuation and international characters
    sanitized = re.sub(r'<[^>]*>', '', text)  # Remove HTML tags
    sanitized = re.sub(r'[<>"\']', '', sanitized)  # Remove dangerous chars
    
    # Limit length for performance
    return sanitized[:2000].strip()

def validate_annotation_data(data: dict) -> bool:
    """
    Validate annotation data structure and content
    """
    if not isinstance(data, dict):
        return False
    
    # Required fields
    if 'content' not in data or not data['content'].strip():
        return False
    
    # Validate annotation type
    valid_types = ['chain', 'device', 'macro', 'general']
    if 'type' in data and data['type'] not in valid_types:
        return False
    
    # Validate position if provided
    if 'position' in data:
        pos = data['position']
        if not isinstance(pos, dict) or 'x' not in pos or 'y' not in pos:
            return False
        try:
            float(pos['x'])
            float(pos['y'])
        except (ValueError, TypeError):
            return False
    
    # Validate content length
    if len(data['content']) > 1000:  # Max 1000 characters
        return False
    
    return True

def validate_rating(rating) -> bool:
    """
    Validate rating value (1-5 stars)
    """
    try:
        rating_val = int(rating)
        return 1 <= rating_val <= 5
    except (ValueError, TypeError):
        return False

def validate_metadata(metadata: dict) -> Tuple[bool, str]:
    """
    Validate enhanced metadata structure
    """
    if not isinstance(metadata, dict):
        return False, "Metadata must be a dictionary"
    
    # Validate title
    if 'title' in metadata:
        title = metadata['title']
        if not isinstance(title, str) or not title.strip():
            return False, "Title must be a non-empty string"
        if len(title) > 100:
            return False, "Title must be less than 100 characters"
    
    # Validate genre
    if 'genre' in metadata and metadata['genre']:
        valid_genres = [
            'house', 'techno', 'ambient', 'dubstep', 'drum-and-bass',
            'trance', 'progressive', 'electro', 'minimal', 'garage',
            'trap', 'hip-hop', 'pop', 'rock', 'jazz', 'classical', 'other'
        ]
        if metadata['genre'] not in valid_genres:
            return False, f"Invalid genre. Must be one of: {', '.join(valid_genres)}"
    
    # Validate BPM
    if 'bpm' in metadata and metadata['bpm']:
        try:
            bpm = float(metadata['bpm'])
            if not (60 <= bpm <= 300):
                return False, "BPM must be between 60 and 300"
        except (ValueError, TypeError):
            return False, "BPM must be a number"
    
    # Validate difficulty
    if 'difficulty' in metadata and metadata['difficulty']:
        valid_difficulties = ['beginner', 'intermediate', 'advanced']
        if metadata['difficulty'] not in valid_difficulties:
            return False, f"Invalid difficulty. Must be one of: {', '.join(valid_difficulties)}"
    
    # Validate tags
    if 'tags' in metadata and metadata['tags']:
        if not isinstance(metadata['tags'], list):
            return False, "Tags must be a list"
        if len(metadata['tags']) > 20:
            return False, "Maximum 20 tags allowed"
        for tag in metadata['tags']:
            if not isinstance(tag, str) or len(tag) > 30:
                return False, "Each tag must be a string with max 30 characters"
    
    return True, ""

def validate_file_upload(file_obj, allowed_extensions=None) -> Tuple[bool, str]:
    """
    Enhanced file upload validation
    """
    if allowed_extensions is None:
        allowed_extensions = {'adg', 'adv'}
    
    # Check if file exists
    if not file_obj:
        return False, "No file provided"
    
    # Check filename
    if not file_obj.filename or file_obj.filename == '':
        return False, "No file selected"
    
    # Check file extension
    if '.' not in file_obj.filename:
        return False, "File must have an extension"
    
    ext = file_obj.filename.rsplit('.', 1)[1].lower()
    if ext not in allowed_extensions:
        return False, f"Invalid file type. Only {', '.join(allowed_extensions)} files are allowed"
    
    # Check file size (max 50MB for enhanced features)
    file_obj.seek(0, 2)  # Seek to end
    file_size = file_obj.tell()
    file_obj.seek(0)  # Reset to beginning
    
    max_size = 50 * 1024 * 1024  # 50MB
    if file_size > max_size:
        return False, f"File too large. Maximum size is {max_size // (1024 * 1024)}MB"
    
    if file_size == 0:
        return False, "File is empty"
    
    return True, ""

def rate_limit_key(user_id: str, action: str) -> str:
    """
    Generate rate limiting key for specific user actions
    """
    return f"rate_limit:{user_id}:{action}"
