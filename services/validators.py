"""Comprehensive input validation utilities"""
import re
import os
from typing import Tuple, List, Dict, Any
from functools import wraps
from flask import jsonify, request

# Optional: python-magic for MIME type detection
try:
    import magic
    HAS_MAGIC = True
except ImportError:
    HAS_MAGIC = False

class ValidationError(Exception):
    """Custom validation error"""
    def __init__(self, message: str, field: str = None, status_code: int = 422):
        self.message = message
        self.field = field
        self.status_code = status_code
        super().__init__(self.message)

class FileValidator:
    """File upload validation with security checks"""
    
    # Restrict file types strictly
    ALLOWED_EXTENSIONS = {'txt', 'md', 'pdf', 'docx', 'csv'}
    ALLOWED_MIME_TYPES = {
        'text/plain': ['txt', 'md'],
        'application/pdf': ['pdf'],
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
        'text/csv': ['csv'],
        'application/vnd.ms-excel': ['csv']
    }
    
    MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
    MAX_FILENAME_LENGTH = 255
    
    @staticmethod
    def validate(file, strict: bool = True) -> Tuple[bool, str]:
        """
        Validate file upload
        
        Args:
            file: werkzeug FileStorage object
            strict: If True, use MIME type validation
            
        Returns:
            Tuple[success: bool, error_message: str]
        """
        # Check file exists
        if not file or file.filename == '':
            return False, 'No file provided'
        
        # Check filename is safe
        filename = file.filename.strip()
        if len(filename) > FileValidator.MAX_FILENAME_LENGTH:
            return False, f'Filename too long (max {FileValidator.MAX_FILENAME_LENGTH} chars)'
        
        # Check file extension
        ext = FileValidator._get_extension(filename)
        if ext not in FileValidator.ALLOWED_EXTENSIONS:
            allowed = ', '.join(FileValidator.ALLOWED_EXTENSIONS)
            return False, f'Invalid file type. Allowed: {allowed}'
        
        # Check file size
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)
        
        if file_size == 0:
            return False, 'File is empty'
        
        if file_size > FileValidator.MAX_FILE_SIZE:
            return False, f'File too large (max {FileValidator.MAX_FILE_SIZE / 1024 / 1024:.1f}MB)'
        
        # MIME type validation (optional, adds security)
        if strict:
            mime_check, mime_error = FileValidator._check_mime_type(file, ext)
            if not mime_check:
                return False, mime_error
        
        return True, None
    
    @staticmethod
    def _get_extension(filename: str) -> str:
        """Safely extract file extension"""
        if '.' not in filename:
            return ''
        return filename.rsplit('.', 1)[1].lower()
    
    @staticmethod
    def _check_mime_type(file, ext: str) -> Tuple[bool, str]:
        """Check MIME type matches extension"""
        if not HAS_MAGIC:
            # If magic library not available, allow it (skip MIME validation)
            return True, None
        
        try:
            # Try to detect MIME type
            mime = magic.Magic(mime=True)
            file.seek(0)
            mime_type = mime.from_buffer(file.read(4096))
            file.seek(0)
            
            # Check if MIME matches allowed types for extension
            for allowed_mime, exts in FileValidator.ALLOWED_MIME_TYPES.items():
                if ext in exts and mime_type.startswith(allowed_mime):
                    return True, None
            
            # If we reach here, MIME type doesn't match
            return False, 'File content does not match file extension'
        except Exception:
            # If magic fails, allow it (not all systems have libmagic)
            return True, None


class InputValidator:
    """Text and data input validation"""
    
    @staticmethod
    def validate_subject(subject: str, min_len: int = 2, max_len: int = 200) -> str:
        """Validate subject input"""
        if not subject or not isinstance(subject, str):
            raise ValidationError('Subject is required', field='subject', status_code=400)
        
        subject = subject.strip()
        
        if len(subject) < min_len:
            raise ValidationError(
                f'Subject must be at least {min_len} characters',
                field='subject'
            )
        
        if len(subject) > max_len:
            raise ValidationError(
                f'Subject cannot exceed {max_len} characters',
                field='subject'
            )
        
        # Check for malicious input
        if not InputValidator._is_safe_text(subject):
            raise ValidationError('Subject contains invalid characters', field='subject')
        
        return subject
    
    @staticmethod
    def validate_hours(hours: Any, min_hours: int = 1, max_hours: int = 168) -> int:
        """Validate study hours input"""
        try:
            hours = int(hours)
        except (ValueError, TypeError):
            raise ValidationError('Hours must be a valid number', field='hours')
        
        if hours < min_hours or hours > max_hours:
            raise ValidationError(
                f'Hours must be between {min_hours} and {max_hours}',
                field='hours'
            )
        
        return hours
    
    @staticmethod
    def validate_days(days: Any, min_days: int = 1, max_days: int = 365) -> int:
        """Validate study days"""
        try:
            days = int(days)
        except (ValueError, TypeError):
            raise ValidationError('Days must be a valid number', field='days')
        
        if days < min_days or days > max_days:
            raise ValidationError(
                f'Days must be between {min_days} and {max_days}',
                field='days'
            )
        
        return days
    
    @staticmethod
    def validate_hours_per_day(hours: Any, min_h: int = 1, max_h: int = 12) -> int:
        """Validate daily study hours"""
        try:
            hours = int(hours)
        except (ValueError, TypeError):
            raise ValidationError(
                'Hours per day must be a valid number',
                field='hours_per_day'
            )
        
        if hours < min_h or hours > max_h:
            raise ValidationError(
                f'Hours per day must be between {min_h} and {max_h}',
                field='hours_per_day'
            )
        
        return hours
    
    @staticmethod
    def validate_learning_style(style: str) -> str:
        """Validate learning style"""
        valid_styles = {
            'visual', 'auditory', 'reading_writing', 'kinesthetic',
            'active_recall', 'spaced_repetition', 'balanced'
        }
        
        style = style.strip().lower() if style else 'balanced'
        
        if style not in valid_styles:
            raise ValidationError(
                f'Learning style must be one of: {", ".join(valid_styles)}',
                field='learning_style'
            )
        
        return style
    
    @staticmethod
    def validate_weak_topics(topics_str: str, min_topics: int = 0, max_topics: int = 10) -> List[str]:
        """Validate weak topics list"""
        if not topics_str or not isinstance(topics_str, str):
            return []
        
        # Split by comma
        topics = [t.strip() for t in topics_str.split(',')]
        topics = [t for t in topics if t]  # Remove empty
        
        if len(topics) > max_topics:
            raise ValidationError(
                f'Cannot specify more than {max_topics} weak topics',
                field='weak_topics'
            )
        
        # Validate each topic
        clean_topics = []
        for topic in topics:
            if not InputValidator._is_safe_text(topic):
                raise ValidationError(
                    f'Topic "{topic}" contains invalid characters',
                    field='weak_topics'
                )
            if len(topic) > 100:
                raise ValidationError(
                    f'Each topic must be under 100 characters',
                    field='weak_topics'
                )
            clean_topics.append(topic)
        
        return clean_topics
    
    @staticmethod
    def validate_text_input(text: str, min_len: int = 10, max_len: int = 1000000) -> str:
        """Validate text input"""
        if not text or not isinstance(text, str):
            raise ValidationError('Text input is required', field='text')
        
        text = text.strip()
        
        if len(text) < min_len:
            raise ValidationError(
                f'Text must be at least {min_len} characters',
                field='text'
            )
        
        if len(text) > max_len:
            raise ValidationError(
                f'Text exceeds maximum length of {max_len} characters',
                field='text'
            )
        
        return text
    
    @staticmethod
    def _is_safe_text(text: str) -> bool:
        """Check if text is safe (no malicious chars)"""
        # Allow alphanumeric, spaces, basic punctuation
        pattern = r'^[a-zA-Z0-9\s\-_.,;:()&\'\"/!?]*$'
        return bool(re.match(pattern, text))
    
    @staticmethod
    def validate_email(email: str) -> str:
        """Validate email format"""
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(pattern, email):
            raise ValidationError('Invalid email format', field='email')
        return email.strip()
    
    @staticmethod
    def validate_username(username: str, min_len: int = 3, max_len: int = 20) -> str:
        """Validate username"""
        if not username or not isinstance(username, str):
            raise ValidationError('Username is required', field='username')
        
        username = username.strip()
        
        if len(username) < min_len:
            raise ValidationError(
                f'Username must be at least {min_len} characters',
                field='username'
            )
        
        if len(username) > max_len:
            raise ValidationError(
                f'Username cannot exceed {max_len} characters',
                field='username'
            )
        
        # Alphanumeric and underscore only
        if not re.match(r'^[a-zA-Z0-9_]+$', username):
            raise ValidationError(
                'Username can only contain letters, numbers, and underscores',
                field='username'
            )
        
        return username
    
    @staticmethod
    def validate_password(password: str, min_len: int = 6) -> str:
        """Validate password"""
        if not password or not isinstance(password, str):
            raise ValidationError('Password is required', field='password')
        
        if len(password) < min_len:
            raise ValidationError(
                f'Password must be at least {min_len} characters',
                field='password'
            )
        
        return password


def sanitize_filename(filename: str) -> str:
    """
    Sanitize filename to prevent directory traversal and other attacks
    
    Args:
        filename: Original filename
        
    Returns:
        Safe filename
    """
    # Remove path components
    filename = os.path.basename(filename)
    
    # Remove special characters
    filename = re.sub(r'[^\w\s.-]', '', filename)
    
    # Replace spaces with underscores
    filename = filename.replace(' ', '_')
    
    # Limit length
    if len(filename) > 255:
        name, ext = filename.rsplit('.', 1) if '.' in filename else (filename, '')
        filename = name[:250] + ('.' + ext if ext else '')
    
    return filename


def validate_request_json(required_fields: List[str] = None) -> Dict[str, Any]:
    """
    Validate request JSON and extract data
    
    Args:
        required_fields: List of required field names
        
    Returns:
        Parsed JSON data
        
    Raises:
        ValidationError: If validation fails
    """
    if not request.is_json:
        raise ValidationError('Request must be JSON', status_code=400)
    
    try:
        data = request.get_json()
    except Exception:
        raise ValidationError('Invalid JSON in request body', status_code=400)
    
    if not data:
        raise ValidationError('Request body is empty', status_code=400)
    
    # Check required fields
    if required_fields:
        missing = [f for f in required_fields if f not in data or data[f] is None]
        if missing:
            raise ValidationError(
                f'Missing required fields: {", ".join(missing)}',
                status_code=400
            )
    
    return data


def require_json(*required_fields):
    """Decorator to validate JSON request"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                data = validate_request_json(list(required_fields))
                return f(*args, data=data, **kwargs)
            except ValidationError as e:
                return jsonify({
                    'success': False,
                    'error': e.message,
                    'field': e.field,
                    'status': e.status_code
                }), e.status_code
        return decorated_function
    return decorator
