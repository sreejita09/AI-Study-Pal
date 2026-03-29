"""Error handling and validation utilities"""
from functools import wraps
from flask import jsonify
from werkzeug.exceptions import RequestEntityTooLarge
import os

class APIError(Exception):
    """Custom API error"""
    def __init__(self, message, status_code=400):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)

def handle_errors(f):
    """Decorator to handle errors and return consistent JSON responses"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except APIError as e:
            return jsonify({
                'success': False,
                'error': e.message,
                'status': e.status_code
            }), e.status_code
        except RequestEntityTooLarge:
            return jsonify({
                'success': False,
                'error': 'File too large. Maximum size is 16MB.',
                'status': 413
            }), 413
        except Exception as e:
            print(f'Unexpected error: {str(e)}')
            return jsonify({
                'success': False,
                'error': 'An unexpected error occurred. Please try again.',
                'status': 500
            }), 500
    return decorated_function

def validate_input(text, min_length=10, max_length=1000000):
    """Validate text input"""
    if not text or not isinstance(text, str):
        raise APIError('Invalid text input', 400)
    
    text = text.strip()
    if len(text) < min_length:
        raise APIError(f'Text must be at least {min_length} characters', 400)
    
    if len(text) > max_length:
        raise APIError(f'Text exceeds maximum length of {max_length} characters', 400)
    
    return text

def validate_file_upload(file, allowed_extensions={'txt', 'md', 'csv', 'pdf'}):
    """Validate file upload"""
    if not file or file.filename == '':
        raise APIError('No file provided', 400)
    
    # Check file extension
    if not has_allowed_extension(file.filename, allowed_extensions):
        raise APIError(f'Invalid file type. Allowed: {", ".join(allowed_extensions)}', 400)
    
    # Check file size (16MB limit)
    file.seek(0, os.SEEK_END)
    file_length = file.tell()
    if file_length > 16 * 1024 * 1024:
        raise APIError('File too large. Maximum size is 16MB.', 413)
    
    file.seek(0)
    return file

def has_allowed_extension(filename, allowed_extensions):
    """Check if file has allowed extension"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in allowed_extensions

def validate_study_plan_input(subject, hours):
    """Validate study plan inputs"""
    if not subject or not isinstance(subject, str):
        raise APIError('Subject is required', 400)
    
    if not subject.strip():
        raise APIError('Subject cannot be empty', 400)
    
    try:
        hours = int(hours)
        if hours < 1 or hours > 168:  # Between 1 and 168 hours (1 week)
            raise APIError('Study hours must be between 1 and 168', 400)
    except (ValueError, TypeError):
        raise APIError('Study hours must be a valid number', 400)
    
    return subject.strip(), hours

def validate_difficulty(difficulty):
    """Validate quiz difficulty"""
    valid_difficulties = {'easy', 'medium', 'hard'}
    if difficulty not in valid_difficulties:
        raise APIError(f'Difficulty must be one of: {", ".join(valid_difficulties)}', 400)
    return difficulty

def sanitize_filename(filename):
    """Sanitize filename to prevent directory traversal"""
    import os
    filename = os.path.basename(filename)
    # Remove any potentially dangerous characters
    filename = "".join(c for c in filename if c.isalnum() or c in ('-', '_', '.'))
    return filename
