"""Main web routes with improved error handling and validation"""
from flask import Blueprint, request, jsonify, send_file, render_template, redirect, url_for
from flask_login import login_required, current_user
from services.file_parser import extract_text_from_file
from services.learning_optimizer import generate_study_plan as generate_optimized_plan
from services.quiz_generator import generate_quiz
from services.summarizer import generate_summary
from services.validators import (
    ValidationError, FileValidator, InputValidator,
    sanitize_filename
)
from services.utils import ResponseFormatter, memoize_plan_generation, track_performance
from services.error_handler import handle_errors, APIError, validate_input, validate_difficulty, validate_file_upload
from services.tips_generator import generate_tips
from services.feedback_generator import generate_feedback
from models import db, StudyPlan, Quiz
import os
import json
import logging

logger = logging.getLogger(__name__)

main_bp = Blueprint('main', __name__)


@main_bp.route('/')
def index():
    """Home page - redirect to dashboard if logged in"""
    if current_user.is_authenticated:
        return render_template('dashboard.html')
    return redirect(url_for('auth.login_page'))


@main_bp.route('/dashboard')
@login_required
def dashboard():
    """Dashboard page for logged-in users"""
    try:
        # Get user's recent study plans
        recent_plans = StudyPlan.query.filter_by(user_id=current_user.id)\
            .order_by(StudyPlan.created_at.desc())\
            .limit(5)\
            .all()
        
        # Get user's quizzes
        recent_quizzes = Quiz.query.filter_by(user_id=current_user.id)\
            .order_by(Quiz.created_at.desc())\
            .limit(5)\
            .all()
        
        return render_template(
            'dashboard.html',
            recent_plans=recent_plans,
            recent_quizzes=recent_quizzes,
            total_plans=StudyPlan.query.filter_by(user_id=current_user.id).count(),
            total_quizzes=Quiz.query.filter_by(user_id=current_user.id).count()
        )
    except Exception as e:
        logger.error(f'Error loading dashboard: {str(e)}')
        return render_template('dashboard.html', error='Error loading dashboard')


@main_bp.route('/generate', methods=['POST'])
@login_required
@track_performance('generate_plan_web')
def generate_plan():
    """Generate study plan - web form submission"""
    try:
        # Extract form data
        subject = request.form.get('subject', '').strip()
        days = request.form.get('days', '7')
        hours_per_day = request.form.get('hours_per_day', '5')
        learning_style = request.form.get('learning_style', 'balanced')
        weak_topics = request.form.get('weak_topics', '')
        
        # Validate inputs
        try:
            subject = InputValidator.validate_subject(subject)
            days = InputValidator.validate_days(days)
            hours_per_day = InputValidator.validate_hours_per_day(hours_per_day)
            learning_style = InputValidator.validate_learning_style(learning_style)
            weak_topics = InputValidator.validate_weak_topics(weak_topics)
        except ValidationError as e:
            return render_template(
                'dashboard.html',
                error=e.message,
                error_field=e.field
            ), 400
        
        # Handle file upload (optional)
        text = None
        if 'file' in request.files and request.files['file']:
            file = request.files['file']
            is_valid, error = FileValidator.validate(file)
            if not is_valid:
                return render_template(
                    'dashboard.html',
                    error=error,
                    error_field='file'
                ), 400
            
            text = extract_text_from_file(file)
            if not text:
                return render_template(
                    'dashboard.html',
                    error='Could not extract text from file'
                ), 400
            
            # Validate extracted text
            try:
                text = InputValidator.validate_text_input(text)
            except ValidationError as e:
                return render_template(
                    'dashboard.html',
                    error=e.message
                ), 400
        
        # Prepare user profile
        user_profile = {
            'hours_per_day': hours_per_day,
            'weak_topics': weak_topics,
            'learning_style': learning_style
        }
        
        # Generate plan (with caching)
        @memoize_plan_generation
        def cached_generate(text_content, subj, profile, num_days):
            return generate_optimized_plan(
                text=text_content or subj,
                subject=subj,
                user_profile=profile,
                days_available=num_days
            )
        
        plan_data = cached_generate(text, subject, user_profile, days)
        
        if not plan_data:
            return render_template(
                'dashboard.html',
                error='Failed to generate study plan - please try again'
            ), 500
        
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
        
        return render_template(
            'dashboard.html',
            generated_plan=plan_data,
            plan_id=study_plan.id,
            success='Study plan generated successfully!'
        ), 200
    
    except ValidationError as e:
        db.session.rollback()
        return render_template(
            'dashboard.html',
            error=e.message,
            error_field=e.field
        ), e.status_code
    
    except Exception as e:
        db.session.rollback()
        logger.error(f'Error generating plan for user {current_user.id}: {str(e)}')
        return render_template(
            'dashboard.html',
            error='Internal error generating plan - the team has been notified'
        ), 500


@main_bp.route('/generate_plan', methods=['POST'])
@login_required
@track_performance('generate_plan_ajax')
def generate_plan_ajax():
    """Generate study plan - AJAX/JSON version used by dashboard."""
    try:
        subject = request.form.get('subject', '').strip()
        hours = request.form.get('hours', '5')

        if not subject:
            raise APIError('Subject is required', 400)

        try:
            hours = int(hours)
        except (TypeError, ValueError):
            raise APIError('Study hours must be a valid number', 400)

        if hours < 1 or hours > 168:
            raise APIError('Study hours must be between 1 and 168', 400)

        text = subject
        if 'file' in request.files and request.files['file']:
            file = request.files['file']
            is_valid, error = FileValidator.validate(file)
            if not is_valid:
                raise APIError(error, 400)

            extracted = extract_text_from_file(file)
            if extracted:
                text = extracted

        user_profile = {
            'hours_per_day': min(hours, 8),
            'weak_topics': [],
            'learning_style': 'balanced'
        }

        days_available = max(1, min(30, hours // max(user_profile['hours_per_day'], 1) or 1))
        plan_data = generate_optimized_plan(
            text=text,
            subject=subject,
            user_profile=user_profile,
            days_available=days_available
        )

        study_plan = StudyPlan(
            user_id=current_user.id,
            subject=subject,
            hours=hours,
            plan_content=json.dumps(plan_data),
            csv_file_path=None
        )
        db.session.add(study_plan)
        db.session.commit()

        return jsonify({
            'success': True,
            'plan': json.dumps(plan_data, indent=2),
            'plan_id': study_plan.id
        }), 201

    except APIError:
        db.session.rollback()
        raise
    except Exception as e:
        db.session.rollback()
        raise APIError(f'Error generating plan: {str(e)}', 500)


@main_bp.route('/generate_optimized_plan', methods=['POST'])
@login_required
@track_performance('generate_optimized_plan_ajax')
def generate_optimized_plan_ajax():
    """Generate optimized study plan - AJAX/JSON version used by dashboard."""
    try:
        subject = request.form.get('subject', '').strip()
        days = request.form.get('days', '7')
        hours_per_day = request.form.get('hours_per_day', '5')
        learning_style = request.form.get('learning_style', 'balanced')
        weak_topics = request.form.get('weak_topics', '')

        if not subject:
            raise APIError('Subject is required', 400)

        try:
            days = int(days)
            hours_per_day = int(hours_per_day)
        except (TypeError, ValueError):
            raise APIError('Days and hours per day must be valid numbers', 400)

        if days < 1 or days > 90:
            raise APIError('Days available must be between 1 and 90', 400)

        if hours_per_day < 1 or hours_per_day > 12:
            raise APIError('Hours per day must be between 1 and 12', 400)

        if 'file' not in request.files or not request.files['file']:
            raise APIError('Please upload study material first', 400)

        file = request.files['file']
        is_valid, error = FileValidator.validate(file)
        if not is_valid:
            raise APIError(error, 400)

        text = extract_text_from_file(file)
        if not text:
            raise APIError('Could not extract text from file', 400)

        user_profile = {
            'hours_per_day': hours_per_day,
            'weak_topics': [topic.strip() for topic in weak_topics.split(',') if topic.strip()],
            'learning_style': learning_style
        }

        plan_data = generate_optimized_plan(
            text=text,
            subject=subject,
            user_profile=user_profile,
            days_available=days
        )

        study_plan = StudyPlan(
            user_id=current_user.id,
            subject=subject,
            hours=days * hours_per_day,
            plan_content=json.dumps(plan_data),
            csv_file_path=None
        )
        db.session.add(study_plan)
        db.session.commit()

        return jsonify({
            'success': True,
            'plan': plan_data,
            'plan_id': study_plan.id
        }), 201

    except APIError:
        db.session.rollback()
        raise
    except Exception as e:
        db.session.rollback()
        raise APIError(f'Error generating optimized plan: {str(e)}', 500)


@main_bp.route('/plans')
@login_required
def view_plans():
    """View all study plans for current user"""
    try:
        page = request.args.get('page', default=1, type=int)
        per_page = 10
        
        paginated = StudyPlan.query.filter_by(user_id=current_user.id)\
            .order_by(StudyPlan.created_at.desc())\
            .paginate(page=page, per_page=per_page)
        
        return render_template(
            'plans.html',
            plans=paginated.items,
            pagination=paginated,
            total=paginated.total
        ), 200
    
    except Exception as e:
        logger.error(f'Error viewing plans: {str(e)}')
        return render_template(
            'dashboard.html',
            error='Error loading study plans'
        ), 500


@main_bp.route('/plans/<plan_id>')
@login_required
def view_plan(plan_id):
    """View specific study plan"""
    try:
        plan = StudyPlan.query.filter_by(
            id=plan_id,
            user_id=current_user.id
        ).first()
        
        if not plan:
            return render_template('404.html'), 404
        
        # Parse plan content
        try:
            plan_data = json.loads(plan.plan_content)
        except (json.JSONDecodeError, TypeError):
            plan_data = {'error': 'Could not parse plan data'}
        
        return render_template(
            'plan_detail.html',
            plan=plan,
            plan_data=plan_data
        ), 200
    
    except Exception as e:
        logger.error(f'Error viewing plan {plan_id}: {str(e)}')
        return render_template('500.html'), 500


@main_bp.route('/plans/<plan_id>/delete', methods=['POST'])
@login_required
def delete_plan(plan_id):
    """Delete a study plan"""
    try:
        plan = StudyPlan.query.filter_by(
            id=plan_id,
            user_id=current_user.id
        ).first()
        
        if not plan:
            return redirect(url_for('main.view_plans')), 404
        
        db.session.delete(plan)
        db.session.commit()
        
        logger.info(f'Deleted plan {plan_id} for user {current_user.id}')
        
        return redirect(url_for('main.view_plans')), 302
    
    except Exception as e:
        db.session.rollback()
        logger.error(f'Error deleting plan {plan_id}: {str(e)}')
        return render_template('500.html'), 500


@main_bp.route('/quizzes')
@login_required
def view_quizzes():
    """View all quizzes for current user"""
    try:
        page = request.args.get('page', default=1, type=int)
        per_page = 10
        
        paginated = Quiz.query.filter_by(user_id=current_user.id)\
            .order_by(Quiz.created_at.desc())\
            .paginate(page=page, per_page=per_page)
        
        return render_template(
            'quizzes.html',
            quizzes=paginated.items,
            pagination=paginated
        ), 200
    
    except Exception as e:
        logger.error(f'Error viewing quizzes: {str(e)}')
        return render_template('500.html'), 500

@main_bp.route('/generate_quiz', methods=['POST'])
@login_required
@handle_errors
def generate_quiz_route():
    """Generate and save quiz"""
    try:
        text_file = request.files.get('file')
        difficulty = request.form.get('difficulty', 'easy')
        text = request.form.get('text', '').strip()
        
        # Validate difficulty
        difficulty = validate_difficulty(difficulty)
        
        # Get text from file or input
        if text_file:
            validate_file_upload(text_file)
            text = extract_text_from_file(text_file)
            if not text:
                raise APIError('Could not extract text from file', 400)
        
        if not text:
            raise APIError('Please provide text or upload a file', 400)
        
        # Validate text length
        validate_input(text, min_length=10, max_length=100000)
        
        # Generate quiz
        quiz_content = generate_quiz(text, difficulty)
        
        # Save to database
        quiz = Quiz(
            user_id=current_user.id,
            subject='Extracted Content',
            difficulty=difficulty,
            quiz_content=str(quiz_content),
            total_questions=len(quiz_content) if isinstance(quiz_content, list) else 1
        )
        db.session.add(quiz)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'quiz': quiz_content,
            'quiz_id': quiz.id
        }), 201
    
    except APIError:
        raise
    except Exception as e:
        db.session.rollback()
        raise APIError(f'Error generating quiz: {str(e)}', 500)

@main_bp.route('/summarize', methods=['POST'])
@login_required
@handle_errors
def summarize_route():
    """Summarize text"""
    try:
        text_file = request.files.get('file')
        text = request.form.get('text', '').strip()
        
        # Get text from file or input
        if text_file:
            validate_file_upload(text_file)
            text = extract_text_from_file(text_file)
            if not text:
                raise APIError('Could not extract text from file', 400)
        
        if not text:
            raise APIError('Please provide text or upload a file', 400)
        
        # Validate text
        validate_input(text, min_length=10, max_length=100000)
        
        # Generate summary
        summary = generate_summary(text)
        
        return jsonify({
            'success': True,
            'summary': summary
        }), 200
    
    except APIError:
        raise
    except Exception as e:
        raise APIError(f'Error summarizing text: {str(e)}', 500)

@main_bp.route('/generate_tips', methods=['POST'])
@login_required
@handle_errors
def generate_tips_route():
    """Generate study tips"""
    try:
        text_file = request.files.get('file')
        text = request.form.get('text', '').strip()
        
        # Get text from file or input
        if text_file:
            validate_file_upload(text_file)
            text = extract_text_from_file(text_file)
            if not text:
                raise APIError('Could not extract text from file', 400)
        
        if not text:
            raise APIError('Please provide text or upload a file', 400)
        
        # Validate text
        validate_input(text, min_length=10, max_length=100000)
        
        # Generate tips
        tips = generate_tips(text)
        
        return jsonify({
            'success': True,
            'tips': tips
        }), 200
    
    except APIError:
        raise
    except Exception as e:
        raise APIError(f'Error generating tips: {str(e)}', 500)

@main_bp.route('/generate_feedback', methods=['POST'])
@login_required
@handle_errors
def generate_feedback_route():
    """Generate motivational feedback"""
    try:
        hours = request.form.get('hours', '5')
        text_file = request.files.get('file')
        
        # Validate hours
        try:
            hours = int(hours)
            if hours < 1 or hours > 168:
                raise APIError('Study hours must be between 1 and 168', 400)
        except (ValueError, TypeError):
            raise APIError('Study hours must be a valid number', 400)
        
        text = None
        if text_file:
            validate_file_upload(text_file)
            text = extract_text_from_file(text_file)
        
        # Generate feedback
        feedback = generate_feedback(hours, text)
        
        return jsonify({
            'success': True,
            'feedback': feedback
        }), 200
    
    except APIError:
        raise
    except Exception as e:
        raise APIError(f'Error generating feedback: {str(e)}', 500)

@main_bp.route('/download/<filename>')
@login_required
def download_file(filename):
    """Download generated CSV file"""
    try:
        # Sanitize filename for security
        filename = sanitize_filename(filename)
        
        # Verify file exists and is in data directory
        file_path = os.path.join('data', filename)
        if not os.path.exists(file_path):
            raise APIError('File not found', 404)
        
        return send_file(file_path, as_attachment=True)
    
    except APIError:
        return jsonify({'success': False, 'error': 'File not found'}), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@main_bp.route('/user/plans', methods=['GET'])
@login_required
def get_user_plans():
    """Get user's study plans"""
    try:
        plans = StudyPlan.query.filter_by(user_id=current_user.id).order_by(
            StudyPlan.created_at.desc()
        ).limit(10).all()
        
        plans_data = [
            {
                'id': p.id,
                'subject': p.subject,
                'hours': p.hours,
                'created_at': p.created_at.isoformat()
            }
            for p in plans
        ]
        
        return jsonify({
            'success': True,
            'plans': plans_data
        }), 200
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@main_bp.route('/user/quizzes', methods=['GET'])
@login_required
def get_user_quizzes():
    """Get user's quizzes"""
    try:
        quizzes = Quiz.query.filter_by(user_id=current_user.id).order_by(
            Quiz.created_at.desc()
        ).limit(10).all()
        
        quizzes_data = [
            {
                'id': q.id,
                'subject': q.subject,
                'difficulty': q.difficulty,
                'score': q.score,
                'created_at': q.created_at.isoformat()
            }
            for q in quizzes
        ]
        
        return jsonify({
            'success': True,
            'quizzes': quizzes_data
        }), 200
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
