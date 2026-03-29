"""API v1 routes with improved error handling, validation, and consistent responses"""
from flask import Blueprint, request, jsonify, send_file
from flask_login import login_required, current_user
from services.file_parser import extract_text_from_file
from services.learning_optimizer import generate_study_plan as generate_optimized_plan
from services.validators import (
    ValidationError, FileValidator, InputValidator,
    sanitize_filename, require_json
)
from services.utils import (
    ResponseFormatter, memoize_plan_generation, check_rate_limit,
    track_performance
)
from models import db, StudyPlan, Quiz
import json
import logging

logger = logging.getLogger(__name__)

# Create blueprint for API v1
api_v1_bp = Blueprint('api_v1', __name__, url_prefix='/api/v1')


# ============================================================================
# ERROR HANDLERS
# ============================================================================

@api_v1_bp.errorhandler(ValidationError)
def handle_validation_error(error):
    """Handle validation errors"""
    response, status = ResponseFormatter.error(
        error=error.message,
        field=error.field,
        status_code=error.status_code
    )
    return jsonify(response), status


@api_v1_bp.errorhandler(400)
def handle_bad_request(error):
    """Handle bad request errors"""
    response, status = ResponseFormatter.error(
        error='Bad request',
        status_code=400
    )
    return jsonify(response), status


@api_v1_bp.errorhandler(401)
def handle_unauthorized(error):
    """Handle unauthorized errors"""
    response, status = ResponseFormatter.error(
        error='Unauthorized - please log in',
        status_code=401
    )
    return jsonify(response), status


@api_v1_bp.errorhandler(404)
def handle_not_found(error):
    """Handle not found errors"""
    response, status = ResponseFormatter.error(
        error='Resource not found',
        status_code=404
    )
    return jsonify(response), status


@api_v1_bp.errorhandler(413)
def handle_payload_too_large(error):
    """Handle file too large errors"""
    response, status = ResponseFormatter.error(
        error='File too large (max 5MB)',
        status_code=413
    )
    return jsonify(response), status


@api_v1_bp.errorhandler(429)
def handle_rate_limit(error):
    """Handle rate limit errors"""
    response, status = ResponseFormatter.error(
        error='Too many requests - rate limit exceeded',
        status_code=429
    )
    return jsonify(response), status


@api_v1_bp.errorhandler(500)
def handle_server_error(error):
    """Handle server errors"""
    logger.error(f'Unhandled server error: {str(error)}')
    response, status = ResponseFormatter.error(
        error='Internal server error - the team has been notified',
        status_code=500
    )
    return jsonify(response), status


# ============================================================================
# STUDY PLANS ENDPOINTS
# ============================================================================

@api_v1_bp.route('/study-plans', methods=['GET'])
@login_required
@track_performance('fetch_user_plans')
def get_user_study_plans():
    """
    Get all study plans for current user
    
    Query params:
        page: Page number (default: 1)
        per_page: Items per page (default: 10)
    
    Returns:
        Paginated list of study plans
    """
    try:
        page = request.args.get('page', default=1, type=int)
        per_page = request.args.get('per_page', default=10, type=int)
        
        # Validate pagination
        if page < 1 or per_page < 1 or per_page > 100:
            raise ValidationError('Invalid pagination parameters', status_code=400)
        
        # Query plans with pagination
        paginated = StudyPlan.query.filter_by(user_id=current_user.id)\
            .order_by(StudyPlan.created_at.desc())\
            .paginate(page=page, per_page=per_page)
        
        plans = []
        for plan in paginated.items:
            plans.append({
                'id': plan.id,
                'subject': plan.subject,
                'hours': plan.hours,
                'created_at': plan.created_at.isoformat(),
                'updated_at': plan.updated_at.isoformat()
            })
        
        response, status = ResponseFormatter.paginated(
            items=plans,
            total=paginated.total,
            page=page,
            per_page=per_page
        )
        return jsonify(response), status
    
    except ValidationError as e:
        response, status = ResponseFormatter.error(e.message, status_code=e.status_code)
        return jsonify(response), status
    except Exception as e:
        logger.error(f'Error fetching study plans: {str(e)}')
        response, status = ResponseFormatter.error(
            'Error fetching study plans',
            status_code=500
        )
        return jsonify(response), status


@api_v1_bp.route('/study-plans/<plan_id>', methods=['GET'])
@login_required
def get_study_plan(plan_id):
    """
    Get specific study plan
    
    Args:
        plan_id: Study plan ID
    
    Returns:
        Study plan details
    """
    try:
        plan = StudyPlan.query.filter_by(
            id=plan_id, 
            user_id=current_user.id
        ).first()
        
        if not plan:
            raise ValidationError(
                'Study plan not found',
                status_code=404
            )
        
        # Parse plan content
        try:
            plan_data = json.loads(plan.plan_content)
        except (json.JSONDecodeError, TypeError):
            plan_data = {'raw': plan.plan_content}
        
        data = {
            'id': plan.id,
            'subject': plan.subject,
            'hours': plan.hours,
            'content': plan_data,
            'created_at': plan.created_at.isoformat(),
            'updated_at': plan.updated_at.isoformat()
        }
        
        response, status = ResponseFormatter.success(data=data)
        return jsonify(response), status
    
    except ValidationError as e:
        response, status = ResponseFormatter.error(e.message, status_code=e.status_code)
        return jsonify(response), status
    except Exception as e:
        logger.error(f'Error fetching plan {plan_id}: {str(e)}')
        response, status = ResponseFormatter.error(
            'Error fetching study plan',
            status_code=500
        )
        return jsonify(response), status


@api_v1_bp.route('/study-plans/generate', methods=['POST'])
@login_required
@track_performance('generate_optimized_plan')
def generate_plan():
    """
    Generate optimized study plan
    
    Form data:
        subject (required): Topic to study
        days (optional): Number of days (default: 7)
        hours_per_day (optional): Hours per day (default: 5)
        learning_style (optional): Learning style (default: balanced)
        weak_topics (optional): Comma-separated weak topics
        file (optional): Study material file (pdf, txt, docx, csv)
    
    Returns:
        Generated study plan
    """
    try:
        # Check rate limit
        allowed, remaining = check_rate_limit(current_user.id)
        if not allowed:
            raise ValidationError(
                f'Rate limit exceeded. Try again later.',
                status_code=429
            )
        
        # Extract and validate inputs
        subject = request.form.get('subject', '').strip()
        subject = InputValidator.validate_subject(subject)
        
        # Optional: file upload
        text = None
        if 'file' in request.files and request.files['file']:
            file = request.files['file']
            is_valid, error = FileValidator.validate(file)
            if not is_valid:
                raise ValidationError(error, field='file', status_code=400)
            
            text = extract_text_from_file(file)
            if not text:
                raise ValidationError(
                    'Could not extract text from file',
                    field='file'
                )
            
            # Validate extracted text
            text = InputValidator.validate_text_input(text)
        
        # Validate optional parameters
        days = int(request.form.get('days', 7))
        days = InputValidator.validate_days(days)
        
        hours_per_day = int(request.form.get('hours_per_day', 5))
        hours_per_day = InputValidator.validate_hours_per_day(hours_per_day)
        
        learning_style = request.form.get('learning_style', 'balanced')
        learning_style = InputValidator.validate_learning_style(learning_style)
        
        weak_topics = request.form.get('weak_topics', '')
        weak_topics = InputValidator.validate_weak_topics(weak_topics)
        
        # Prepare user profile
        user_profile = {
            'hours_per_day': hours_per_day,
            'weak_topics': weak_topics,
            'learning_style': learning_style
        }
        
        # Generate plan (with caching)
        @memoize_plan_generation
        def cached_generate(text, subject, profile, days):
            return generate_optimized_plan(
                text=text or subject,
                subject=subject,
                user_profile=profile,
                days_available=days
            )
        
        plan_data = cached_generate(text, subject, user_profile, days)
        
        if not plan_data:
            raise ValidationError(
                'Failed to generate study plan - please try again',
                status_code=500
            )
        
        # Save to database
        study_plan = StudyPlan(
            user_id=current_user.id,
            subject=subject,
            hours=days * hours_per_day,
            plan_content=json.dumps(plan_data),
            csv_file_path=None
        )
        
        db.session.add(study_plan)
        db.session.commit()
        
        logger.info(f'Generated plan for user {current_user.id}: {subject}')
        
        response, status = ResponseFormatter.success(
            data={
                'plan_id': study_plan.id,
                'plan': plan_data,
                'metadata': {
                    'subject': subject,
                    'days': days,
                    'hours_per_day': hours_per_day,
                    'total_hours': days * hours_per_day
                }
            },
            message='Study plan generated successfully',
            status_code=201
        )
        return jsonify(response), status
    
    except ValidationError as e:
        db.session.rollback()
        response, status = ResponseFormatter.error(
            e.message,
            field=e.field,
            status_code=e.status_code
        )
        return jsonify(response), status
    
    except ValueError as e:
        db.session.rollback()
        response, status = ResponseFormatter.error(
            f'Invalid input: {str(e)}',
            status_code=400
        )
        return jsonify(response), status
    
    except Exception as e:
        db.session.rollback()
        logger.error(f'Error generating plan for user {current_user.id}: {str(e)}')
        response, status = ResponseFormatter.error(
            'Error generating study plan',
            status_code=500
        )
        return jsonify(response), status


@api_v1_bp.route('/study-plans/<plan_id>', methods=['DELETE'])
@login_required
def delete_study_plan(plan_id):
    """Delete a study plan"""
    try:
        plan = StudyPlan.query.filter_by(
            id=plan_id,
            user_id=current_user.id
        ).first()
        
        if not plan:
            raise ValidationError('Study plan not found', status_code=404)
        
        db.session.delete(plan)
        db.session.commit()
        
        response, status = ResponseFormatter.success(
            message='Study plan deleted successfully'
        )
        return jsonify(response), status
    
    except ValidationError as e:
        response, status = ResponseFormatter.error(e.message, status_code=e.status_code)
        return jsonify(response), status
    except Exception as e:
        db.session.rollback()
        logger.error(f'Error deleting plan {plan_id}: {str(e)}')
        response, status = ResponseFormatter.error(
            'Error deleting study plan',
            status_code=500
        )
        return jsonify(response), status


# ============================================================================
# QUIZZES ENDPOINTS
# ============================================================================

@api_v1_bp.route('/quizzes', methods=['GET'])
@login_required
def get_user_quizzes():
    """Get all quizzes for current user"""
    try:
        page = request.args.get('page', default=1, type=int)
        per_page = request.args.get('per_page', default=10, type=int)
        
        paginated = Quiz.query.filter_by(user_id=current_user.id)\
            .order_by(Quiz.created_at.desc())\
            .paginate(page=page, per_page=per_page)
        
        quizzes = []
        for quiz in paginated.items:
            quizzes.append({
                'id': quiz.id,
                'subject': quiz.subject,
                'difficulty': quiz.difficulty,
                'total_questions': quiz.total_questions,
                'score': quiz.score,
                'created_at': quiz.created_at.isoformat(),
                'completed_at': quiz.completed_at.isoformat() if quiz.completed_at else None
            })
        
        response, status = ResponseFormatter.paginated(
            items=quizzes,
            total=paginated.total,
            page=page,
            per_page=per_page
        )
        return jsonify(response), status
    
    except Exception as e:
        logger.error(f'Error fetching quizzes: {str(e)}')
        response, status = ResponseFormatter.error(
            'Error fetching quizzes',
            status_code=500
        )
        return jsonify(response), status


# ============================================================================
# MISC ENDPOINTS
# ============================================================================

@api_v1_bp.route('/health', methods=['GET'])
def health_check():
    """API health check"""
    response, status = ResponseFormatter.success(
        data={'status': 'healthy'},
        message='API is operational'
    )
    return jsonify(response), status


@api_v1_bp.route('/version', methods=['GET'])
def get_version():
    """Get API version"""
    response, status = ResponseFormatter.success(
        data={'version': '1.0.0', 'name': 'AI Study Pal API'},
        message='API version info'
    )
    return jsonify(response), status
