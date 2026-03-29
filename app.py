"""Main Flask application with comprehensive error handling and scalability"""
from flask import Flask, render_template, redirect, url_for, jsonify
from flask_login import LoginManager, current_user
from models import db, User
from config import config, ProductionConfig
from routes.auth import auth_bp
from routes.main import main_bp
from routes.api_v1 import api_v1_bp
from services.email_service import mail
import os
import logging
from logging.handlers import RotatingFileHandler
from sqlalchemy import text

def create_app(config_name='development'):
    """
    Application factory
    
    Args:
        config_name: Configuration environment (development, testing, production)
        
    Returns:
        Configured Flask application instance
    """
    app = Flask(__name__)
    
    # Load configuration
    config_obj = config.get(config_name, config['default'])
    app.config.from_object(config_obj)
    
    # Setup logging
    _setup_logging(app)
    
    # Initialize database extension
    db.init_app(app)
    
    # Initialize email service
    mail.init_app(app)
    
    # Initialize Flask-Login
    login_manager = LoginManager()
    login_manager.init_app(app)
    login_manager.login_view = 'auth.login_page'
    login_manager.login_message = 'Please log in to access this page.'
    login_manager.login_message_category = 'info'
    
    @login_manager.user_loader
    def load_user(user_id):
        """Load user by ID from database"""
        return User.query.get(user_id)
    
    # Register blueprints
    app.register_blueprint(auth_bp)          # /auth/* routes
    app.register_blueprint(main_bp)          # Main web routes
    app.register_blueprint(api_v1_bp)        # /api/v1/* API routes
    
    # Initialize application context
    with app.app_context():
        # Create database tables
        db.create_all()
        _ensure_sqlite_schema_compatibility(app)
        
        # Create required directories
        for directory in ['data', 'uploads', 'logs']:
            if not os.path.exists(directory):
                os.makedirs(directory)
    
    # Root route
    @app.route('/')
    def root():
        """Root route - redirect to dashboard or login"""
        if current_user.is_authenticated:
            return redirect(url_for('main.index'))
        return redirect(url_for('main.index'))
    
    # API root
    @app.route('/api')
    def api_root():
        """API root endpoint"""
        return jsonify({
            'name': app.config.get('API_TITLE', 'AI Study Pal API'),
            'version': app.config.get('API_VERSION', '1.0.0'),
            'endpoints': {
                'study_plans': '/api/v1/study-plans',
                'quizzes': '/api/v1/quizzes',
                'health': '/api/v1/health'
            }
        }), 200
    
    # Error handlers - return consistent JSON responses
    @app.errorhandler(400)
    def handle_bad_request(error):
        """Handle 400 Bad Request"""
        return jsonify({
            'success': False,
            'error': 'Bad request',
            'status': 400
        }), 400
    
    @app.errorhandler(401)
    def handle_unauthorized(error):
        """Handle 401 Unauthorized"""
        return jsonify({
            'success': False,
            'error': 'Unauthorized - please log in',
            'status': 401
        }), 401
    
    @app.errorhandler(403)
    def handle_forbidden(error):
        """Handle 403 Forbidden"""
        return jsonify({
            'success': False,
            'error': 'Forbidden - you do not have permission',
            'status': 403
        }), 403
    
    @app.errorhandler(404)
    def handle_not_found(error):
        """Handle 404 Not Found"""
        # Return HTML for web requests, JSON for API requests
        if _is_api_request():
            return jsonify({
                'success': False,
                'error': 'Resource not found',
                'status': 404
            }), 404
        return render_template('404.html'), 404
    
    @app.errorhandler(413)
    def handle_payload_too_large(error):
        """Handle 413 Payload Too Large"""
        return jsonify({
            'success': False,
            'error': 'File too large (max 5MB)',
            'status': 413
        }), 413
    
    @app.errorhandler(500)
    def handle_server_error(error):
        """Handle 500 Internal Server Error"""
        app.logger.error(f'Unhandled error: {str(error)}')
        
        # Return HTML for web requests, JSON for API requests
        if _is_api_request():
            return jsonify({
                'success': False,
                'error': 'Internal server error - the team has been notified',
                'status': 500
            }), 500
        return render_template('500.html'), 500
    
    @app.errorhandler(503)
    def handle_service_unavailable(error):
        """Handle 503 Service Unavailable"""
        return jsonify({
            'success': False,
            'error': 'Service temporarily unavailable',
            'status': 503
        }), 503
    
    # Health check endpoint
    @app.route('/health', methods=['GET'])
    def health_check():
        """Application health check"""
        return jsonify({
            'status': 'healthy',
            'version': app.config.get('API_VERSION', '1.0.0')
        }), 200
    
    return app


def get_runtime_config_name():
    """Resolve the environment-specific config for local runs and WSGI servers."""
    return os.getenv('FLASK_ENV', os.getenv('APP_ENV', 'development'))


def create_runtime_app():
    """
    Create the runtime WSGI app and enforce production-only validation.

    Tests can keep using create_app(...) directly without supplying real
    production credentials, while deployed entrypoints still fail fast.
    """
    config_name = get_runtime_config_name()
    app = create_app(config_name)

    if config_name == 'production':
        try:
            ProductionConfig.validate()
        except ValueError as e:
            raise RuntimeError(f'Production configuration error: {str(e)}') from e

    return app


def _setup_logging(app):
    """Setup application logging"""
    if not app.debug:
        # Create logs directory
        if not os.path.exists('logs'):
            os.makedirs('logs')
        
        # File handler
        file_handler = RotatingFileHandler(
            'logs/app.log',
            maxBytes=10 * 1024 * 1024,  # 10MB
            backupCount=10
        )
        file_handler.setFormatter(logging.Formatter(
            '[%(asctime)s] %(levelname)s in %(module)s: %(message)s'
        ))
        file_handler.setLevel(logging.INFO)
        app.logger.addHandler(file_handler)
        
        app.logger.setLevel(logging.INFO)
        app.logger.info('Application startup')


def _ensure_sqlite_schema_compatibility(app):
    """
    Backfill newly added SQLite columns for local databases created before
    email verification fields were introduced.

    SQLAlchemy's create_all() creates missing tables but does not alter
    existing ones, so older `instance/study_pal.db` files need a lightweight
    compatibility upgrade.
    """
    database_uri = app.config.get('SQLALCHEMY_DATABASE_URI', '')
    if not database_uri.startswith('sqlite'):
        return

    existing_columns = {
        row[1]
        for row in db.session.execute(text("PRAGMA table_info(users)")).fetchall()
    }

    alter_statements = []
    if 'email_verified' not in existing_columns:
        alter_statements.append(
            "ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT 0"
        )
    if 'email_token' not in existing_columns:
        alter_statements.append(
            "ALTER TABLE users ADD COLUMN email_token VARCHAR(255)"
        )

    for statement in alter_statements:
        db.session.execute(text(statement))

    if alter_statements:
        db.session.commit()
        app.logger.info(
            'Applied SQLite schema compatibility update: %s',
            ', '.join(
                statement.split(' ADD COLUMN ', 1)[1].split(' ', 1)[0]
                for statement in alter_statements
            )
        )


def _is_api_request():
    """Check if request is for API endpoint"""
    from flask import request
    return request.path.startswith('/api/')

app = create_runtime_app()

if __name__ == '__main__':
    # NOTE: Flask runs on port 5001. The Node.js backend uses port 5000.
    app.run(debug=app.config['DEBUG'], host='127.0.0.1', port=5001)

