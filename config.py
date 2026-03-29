import os
from datetime import timedelta

class Config:
    """Base configuration - shared across all environments"""
    
    # Flask core
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    DEBUG = False
    TESTING = False
    
    # Database configuration (supports SQLite, PostgreSQL)
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'sqlite:///study_pal.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Connection pool configuration (only for PostgreSQL, not SQLite)
    _is_postgres = 'postgresql' in os.getenv('DATABASE_URL', 'sqlite://')
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_size': 10,
        'pool_recycle': 3600,
        'pool_pre_ping': True,
        'connect_args': {'timeout': 10}
    } if _is_postgres else {}
    
    # Session configuration
    SESSION_COOKIE_SECURE = False
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    SESSION_REFRESH_EACH_REQUEST = True
    PERMANENT_SESSION_LIFETIME = timedelta(days=30)
    REMEMBER_COOKIE_DURATION = timedelta(days=30)
    REMEMBER_COOKIE_HTTPONLY = True
    
    # File upload
    MAX_CONTENT_LENGTH = 5 * 1024 * 1024  # 5MB max file size
    UPLOAD_FOLDER = os.getenv('UPLOAD_FOLDER', 'uploads')
    ALLOWED_EXTENSIONS = {'txt', 'md', 'csv', 'pdf', 'docx'}
    
    # Email configuration (Gmail default, supports SendGrid, AWS SES)
    MAIL_SERVER = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
    MAIL_PORT = int(os.getenv('MAIL_PORT', 587))
    MAIL_USE_TLS = os.getenv('MAIL_USE_TLS', 'True').lower() == 'true'
    MAIL_USERNAME = os.getenv('MAIL_USERNAME', '')
    MAIL_PASSWORD = os.getenv('MAIL_PASSWORD', '')
    MAIL_DEFAULT_SENDER = os.getenv('MAIL_DEFAULT_SENDER', 'noreply@aistudypal.com')
    
    # Logging configuration
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
    LOG_FILE = os.getenv('LOG_FILE', 'app.log')
    
    # Cache configuration (supports simple in-memory or Redis)
    CACHE_TYPE = os.getenv('CACHE_TYPE', 'simple')
    CACHE_REDIS_URL = os.getenv('REDIS_URL', None)
    
    # Rate limiting
    RATELIMIT_ENABLED = os.getenv('RATELIMIT_ENABLED', 'True').lower() == 'true'
    RATELIMIT_DEFAULT = os.getenv('RATELIMIT_DEFAULT', '100/hour')
    
    # Plan generation optimization
    PLAN_CACHE_SIZE = int(os.getenv('PLAN_CACHE_SIZE', 256))
    PLAN_CACHE_ENABLED = os.getenv('PLAN_CACHE_ENABLED', 'True').lower() == 'true'
    
    # API versioning
    API_VERSION = '1.0.0'
    API_TITLE = 'AI Study Pal API'


class DevelopmentConfig(Config):
    """Development configuration - debug enabled, local SQLite"""
    DEBUG = True
    TESTING = False
    SESSION_COOKIE_SECURE = False
    SQLALCHEMY_ECHO = os.getenv('SQLALCHEMY_ECHO', 'False').lower() == 'true'
    LOG_LEVEL = 'DEBUG'


class TestingConfig(Config):
    """Testing configuration - in-memory database, no external services"""
    DEBUG = True
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    SQLALCHEMY_ENGINE_OPTIONS = {}  # Override parent's pool config
    SECRET_KEY = 'test-secret-key-for-testing'
    WTF_CSRF_ENABLED = False
    SESSION_COOKIE_SECURE = False
    LOG_LEVEL = 'DEBUG'
    # Disable email in tests
    MAIL_SUPPRESS_SEND = True


class ProductionConfig(Config):
    """Production configuration - secure, optimized, with external services"""
    DEBUG = False
    TESTING = False
    SESSION_COOKIE_SECURE = True
    REMEMBER_COOKIE_HTTPONLY = True
    SQLALCHEMY_ECHO = False
    LOG_LEVEL = 'INFO'
    
    # Require environment variables in production
    @classmethod
    def validate(cls):
        """Validate that required environment variables are set"""
        required_vars = ['SECRET_KEY', 'DATABASE_URL']
        missing = []
        for var in required_vars:
            if not os.getenv(var) or os.getenv(var) == f'dev-{var.lower()}':
                missing.append(var)

        if missing:
            raise ValueError(
                f'Production environment incomplete. Missing or invalid: {", ".join(missing)}. '
                'See DEPLOYMENT_GUIDE.md for setup instructions.'
            )

        database_url = os.getenv('DATABASE_URL', '')
        if not database_url.startswith(('postgresql://', 'postgresql+psycopg://')):
            raise ValueError(
                'Production DATABASE_URL must use PostgreSQL. '
                'SQLite is only supported for development/testing.'
            )


# Configuration dictionary for easy access
config = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}
