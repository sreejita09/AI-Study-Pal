"""Authentication routes"""
from flask import Blueprint, request, jsonify, render_template, redirect, url_for
from flask_login import login_user, logout_user, login_required, current_user
from models import User, db
from services.error_handler import APIError, handle_errors, validate_input
from services.email_service import (
    generate_verification_token,
    send_verification_email,
    send_welcome_email,
    build_verification_link,
    is_email_configured
)
import re
import os

auth_bp = Blueprint('auth', __name__, url_prefix='/auth')

@auth_bp.route('/login', methods=['GET'])
def login_page():
    """Serve login page"""
    if current_user.is_authenticated:
        return redirect(url_for('main.index'))
    return render_template('auth.html')

def validate_email(email):
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None


def is_local_dev_mode():
    """Return True when running locally without real email delivery."""
    return os.getenv('FLASK_ENV', 'development') != 'production' and not is_email_configured()

def validate_password_strength(password):
    """Validate password strength and return strength level
    Strong password: 8+ chars, uppercase, lowercase, number, special char
    Medium password: 7+ chars, at least uppercase and lowercase
    Weak password: 6+ chars
    """
    if len(password) < 8:
        raise APIError('Password must be at least 8 characters', 400)
    
    strength = {
        'score': 0,
        'level': 'weak',
        'feedback': []
    }
    
    # Length check
    if len(password) >= 8:
        strength['score'] += 1
    else:
        strength['feedback'].append('Use at least 8 characters')
    
    if len(password) >= 12:
        strength['score'] += 1
    
    # Character variety checks
    if re.search(r'[a-z]', password):
        strength['score'] += 1
    else:
        strength['feedback'].append('Add lowercase letters')
    
    if re.search(r'[A-Z]', password):
        strength['score'] += 1
    else:
        strength['feedback'].append('Add uppercase letters')
    
    if re.search(r'[0-9]', password):
        strength['score'] += 1
    else:
        strength['feedback'].append('Add numbers')
    
    if re.search(r'[!@#$%^&*()_+\-=\[\]{};:\'",.<>?/\\|`~]', password):
        strength['score'] += 1
    else:
        strength['feedback'].append('Add special characters')
    
    # Determine level
    if strength['score'] >= 5:
        strength['level'] = 'strong'
    elif strength['score'] >= 3:
        strength['level'] = 'medium'
    else:
        strength['level'] = 'weak'
    
    return strength


def enforce_password_requirements(password):
    """Enforce production password rules for registration."""
    validate_password_strength(password)

    if not re.search(r'[a-z]', password):
        raise APIError('Password must include at least one lowercase letter', 400)

    if not re.search(r'[A-Z]', password):
        raise APIError('Password must include at least one uppercase letter', 400)

    if not re.search(r'[0-9!@#$%^&*()_+\-=\[\]{};:\'",.<>?/\\|`~]', password):
        raise APIError('Password must include at least one number or symbol', 400)

@auth_bp.route('/check-password-strength', methods=['POST'])
@handle_errors
def check_password_strength():
    """Check password strength in real-time"""
    try:
        data = request.get_json()
        password = data.get('password', '')
        
        if not password:
            return jsonify({'score': 0, 'level': 'empty', 'feedback': []}), 200
        
        strength = validate_password_strength(password)
        return jsonify(strength), 200
    except APIError as e:
        # For password < 6, just return weak
        return jsonify({'score': 0, 'level': 'weak', 'feedback': ['Password is too short']}), 200
@auth_bp.route('/check-username', methods=['POST'])
@handle_errors
def check_username():
    """Check if username is available"""
    try:
        data = request.get_json()
        username = data.get('username', '').strip()
        
        if not username or len(username) < 3:
            return jsonify({'available': False}), 200
        
        # Check if username exists
        existing_user = User.query.filter_by(username=username).first()
        
        return jsonify({'available': existing_user is None}), 200
    except Exception as e:
        return jsonify({'available': False}), 200
@auth_bp.route('/register', methods=['POST'])
@handle_errors
def register_api():
    """Register new user"""
    try:
        data = request.get_json()
        
        if not data:
            raise APIError('Request body is required', 400)
        
        username = data.get('username', '').strip()
        email = data.get('email', '').strip()
        password = data.get('password', '')
        
        # Validation
        if not username or len(username) < 3:
            raise APIError('Username must be at least 3 characters', 400)
        
        if not email or not validate_email(email):
            raise APIError('Invalid email format', 400)
        
        # Validate password strength
        enforce_password_requirements(password)
        
        # Check if user exists
        if User.query.filter_by(username=username).first():
            raise APIError('Username already exists', 409)
        
        if User.query.filter_by(email=email).first():
            raise APIError('Email already registered', 409)
        
        # Create new user with email verification token
        verification_token = generate_verification_token()
        user = User(username=username, email=email, email_token=verification_token)
        user.set_password(password)

        if is_local_dev_mode():
            user.email_verified = True
            user.email_token = None

        db.session.add(user)
        db.session.commit()
        
        # Send verification email
        if not is_local_dev_mode():
            send_verification_email(email, username, verification_token)
        
        response = {
            'success': True,
            'message': 'Registration successful! Please check your email to verify your account.',
            'email': email
        }

        if is_local_dev_mode():
            response['message'] = (
                'Registration successful! Email verification is auto-approved in local development.'
            )
        elif not is_email_configured():
            response['dev_verification_link'] = build_verification_link(verification_token)
            response['message'] = (
                'Registration successful! Email is not configured in local dev, '
                'so use the verification link returned in this response.'
            )

        return jsonify(response), 201
    
    except APIError:
        raise
    except Exception as e:
        db.session.rollback()
        raise APIError(str(e), 500)

@auth_bp.route('/verify-email/<token>', methods=['GET'])
def verify_email(token):
    """Verify email token"""
    try:
        user = User.query.filter_by(email_token=token).first()
        
        if not user:
            return render_template('verify_email.html', success=False, message='Invalid verification token')
        
        if user.email_verified:
            return render_template('verify_email.html', success=True, message='Email already verified')
        
        # Mark email as verified
        user.email_verified = True
        user.email_token = None
        db.session.commit()
        
        # Send welcome email
        send_welcome_email(user.email, user.username)
        
        return render_template('verify_email.html', success=True, message='Email verified successfully! You can now log in.')
    
    except Exception as e:
        return render_template('verify_email.html', success=False, message=f'Error verifying email: {str(e)}')


@auth_bp.route('/resend-verification', methods=['POST'])
@handle_errors
def resend_verification():
    """Resend or reissue verification token for an existing unverified user."""
    data = request.get_json()

    if not data:
        raise APIError('Request body is required', 400)

    identifier = data.get('email', '').strip() or data.get('username', '').strip()
    if not identifier:
        raise APIError('Email or username is required', 400)

    if validate_email(identifier):
        user = User.query.filter_by(email=identifier).first()
    else:
        user = User.query.filter_by(username=identifier).first()

    if not user:
        raise APIError('User not found', 404)

    if user.email_verified:
        return jsonify({
            'success': True,
            'message': 'Email is already verified.'
        }), 200

    verification_token = generate_verification_token()
    user.email_token = verification_token
    db.session.commit()

    send_verification_email(user.email, user.username, verification_token)

    response = {
        'success': True,
        'message': 'Verification email sent again.'
    }

    if not is_email_configured():
        response['dev_verification_link'] = build_verification_link(verification_token)
        response['message'] = (
            'Verification link regenerated for local dev. '
            'Open the link returned in this response.'
        )

    return jsonify(response), 200


@auth_bp.route('/dev-delete-user', methods=['POST'])
@handle_errors
def dev_delete_user():
    """
    Local development helper to remove a user so the same username/email
    can be reused during testing.
    """
    if os.getenv('FLASK_ENV', 'development') == 'production':
        raise APIError('This endpoint is disabled in production', 403)

    data = request.get_json()
    if not data:
        raise APIError('Request body is required', 400)

    username = data.get('username', '').strip()
    email = data.get('email', '').strip()

    if not username and not email:
        raise APIError('Username or email is required', 400)

    query = User.query
    if username and email:
        user = query.filter((User.username == username) | (User.email == email)).first()
    elif username:
        user = query.filter_by(username=username).first()
    else:
        user = query.filter_by(email=email).first()

    if not user:
        raise APIError('User not found', 404)

    deleted = {
        'username': user.username,
        'email': user.email,
        'email_verified': bool(user.email_verified)
    }

    db.session.delete(user)
    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'User deleted successfully for local testing.',
        'deleted_user': deleted
    }), 200


@auth_bp.route('/dev-reset-users', methods=['POST'])
@handle_errors
def dev_reset_users():
    """Delete all local users so usernames/emails can be reused during testing."""
    if os.getenv('FLASK_ENV', 'development') == 'production':
        raise APIError('This endpoint is disabled in production', 403)

    users = User.query.all()
    deleted_count = len(users)

    for user in users:
        db.session.delete(user)

    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'All local test users deleted successfully.',
        'deleted_count': deleted_count
    }), 200

@auth_bp.route('/login-api', methods=['POST'])
@handle_errors
def login_api():
    """Login user API"""
    try:
        data = request.get_json()
        
        if not data:
            raise APIError('Request body is required', 400)
        
        username = data.get('username', '')
        password = data.get('password', '')
        remember = data.get('remember', False)
        
        if not username or not password:
            raise APIError('Username and password are required', 400)
        
        user = User.query.filter_by(username=username).first()
        
        if not user or not user.check_password(password):
            raise APIError('Invalid username or password', 401)
        
        # In local development without SMTP, auto-verify existing test accounts
        if not user.email_verified and is_local_dev_mode():
            user.email_verified = True
            user.email_token = None
            db.session.commit()

        # Check if email is verified
        if not user.email_verified:
            raise APIError('Please verify your email before logging in.', 403)
        
        login_user(user, remember=remember)
        
        return jsonify({
            'success': True,
            'message': 'Login successful',
            'user': {'id': user.id, 'username': user.username, 'email': user.email}
        }), 200
    
    except APIError:
        raise
    except Exception as e:
        raise APIError(str(e), 500)

@auth_bp.route('/logout', methods=['POST'])
@login_required
def logout():
    """Logout user"""
    logout_user()
    return jsonify({'success': True, 'message': 'Logged out successfully'}), 200

@auth_bp.route('/me', methods=['GET'])
@login_required
def get_current_user():
    """Get current user info"""
    return jsonify({
        'success': True,
        'user': {
            'id': current_user.id,
            'username': current_user.username,
            'email': current_user.email,
            'created_at': current_user.created_at.isoformat()
        }
    }), 200

@auth_bp.route('/check', methods=['GET'])
def check_auth():
    """Check if user is authenticated"""
    if current_user.is_authenticated:
        return jsonify({
            'authenticated': True,
            'user': {'id': current_user.id, 'username': current_user.username}
        }), 200
    return jsonify({'authenticated': False}), 200
