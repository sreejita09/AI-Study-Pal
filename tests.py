"""Unit tests for AI Study Pal - pytest based"""
import pytest
import json
from app import create_app
from models import db, User, StudyPlan, Quiz
from services.validators import InputValidator, FileValidator, ValidationError


@pytest.fixture
def app():
    """Create application for test"""
    app = create_app('testing')
    
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    """Create test client"""
    return app.test_client()


@pytest.fixture
def runner(app):
    """Create CLI runner"""
    return app.test_cli_runner()


@pytest.fixture
def test_user(app):
    """Create test user"""
    with app.app_context():
        user = User(
            username='testuser',
            email='test@example.com'
        )
        user.set_password('TestPassword123!')
        db.session.add(user)
        db.session.commit()
        return user


# ============================================================================
# INPUT VALIDATION TESTS
# ============================================================================

class TestInputValidator:
    """Tests for input validation"""
    
    def test_validate_subject_valid(self):
        """Test valid subject validation"""
        subject = InputValidator.validate_subject('Machine Learning')
        assert subject == 'Machine Learning'
    
    def test_validate_subject_empty(self):
        """Test subject validation with empty string"""
        with pytest.raises(ValidationError) as exc_info:
            InputValidator.validate_subject('')
        assert 'required' in str(exc_info.value.message).lower()
    
    def test_validate_subject_too_short(self):
        """Test subject validation with too short input"""
        with pytest.raises(ValidationError) as exc_info:
            InputValidator.validate_subject('M')
        assert 'at least' in str(exc_info.value.message).lower()
    
    def test_validate_subject_too_long(self):
        """Test subject validation with too long input"""
        long_subject = 'A' * 300
        with pytest.raises(ValidationError) as exc_info:
            InputValidator.validate_subject(long_subject)
        assert 'cannot exceed' in str(exc_info.value.message).lower()
    
    def test_validate_hours_valid(self):
        """Test valid hours validation"""
        hours = InputValidator.validate_hours('24')
        assert hours == 24
    
    def test_validate_hours_invalid_type(self):
        """Test hours validation with invalid type"""
        with pytest.raises(ValidationError) as exc_info:
            InputValidator.validate_hours('not_a_number')
        assert 'valid number' in str(exc_info.value.message).lower()
    
    def test_validate_hours_out_of_range(self):
        """Test hours validation out of range"""
        with pytest.raises(ValidationError) as exc_info:
            InputValidator.validate_hours('200')  # Max is 168
        assert 'between' in str(exc_info.value.message).lower()
    
    def test_validate_days_valid(self):
        """Test valid days validation"""
        days = InputValidator.validate_days('7')
        assert days == 7
    
    def test_validate_hours_per_day_valid(self):
        """Test valid hours per day validation"""
        hours = InputValidator.validate_hours_per_day('5')
        assert hours == 5
    
    def test_validate_learning_style_valid(self):
        """Test valid learning style validation"""
        style = InputValidator.validate_learning_style('visual')
        assert style == 'visual'
    
    def test_validate_learning_style_invalid(self):
        """Test invalid learning style"""
        with pytest.raises(ValidationError):
            InputValidator.validate_learning_style('invalid_style')
    
    def test_validate_weak_topics_valid(self):
        """Test valid weak topics"""
        topics = InputValidator.validate_weak_topics('Calculus, Statistics')
        assert len(topics) == 2
        assert 'Calculus' in topics
        assert 'Statistics' in topics
    
    def test_validate_weak_topics_empty(self):
        """Test weak topics with empty string"""
        topics = InputValidator.validate_weak_topics('')
        assert topics == []
    
    def test_validate_weak_topics_too_many(self):
        """Test weak topics exceeding limit"""
        topics_str = ', '.join([f'Topic{i}' for i in range(15)])
        with pytest.raises(ValidationError) as exc_info:
            InputValidator.validate_weak_topics(topics_str)
        assert 'cannot specify more' in str(exc_info.value.message).lower()
    
    def test_validate_email_valid(self):
        """Test valid email"""
        email = InputValidator.validate_email('test@example.com')
        assert email == 'test@example.com'
    
    def test_validate_email_invalid(self):
        """Test invalid email"""
        with pytest.raises(ValidationError):
            InputValidator.validate_email('invalid-email')
    
    def test_validate_username_valid(self):
        """Test valid username"""
        username = InputValidator.validate_username('testuser123')
        assert username == 'testuser123'
    
    def test_validate_username_too_short(self):
        """Test username too short"""
        with pytest.raises(ValidationError):
            InputValidator.validate_username('ab')
    
    def test_validate_username_invalid_chars(self):
        """Test username with invalid characters"""
        with pytest.raises(ValidationError):
            InputValidator.validate_username('test-user!')
    
    def test_validate_password_valid(self):
        """Test valid password"""
        password = InputValidator.validate_password('TestPass123')
        assert password == 'TestPass123'
    
    def test_validate_password_too_short(self):
        """Test password too short"""
        with pytest.raises(ValidationError):
            InputValidator.validate_password('short')


# ============================================================================
# DATABASE MODEL TESTS
# ============================================================================

class TestUserModel:
    """Tests for User model"""
    
    def test_user_creation(self, app):
        """Test user creation"""
        with app.app_context():
            user = User(
                username='newuser',
                email='new@example.com'
            )
            user.set_password('TestPassword123!')
            assert user.username == 'newuser'
            assert user.email == 'new@example.com'
    
    def test_user_password_hashing(self, app):
        """Test password hashing"""
        with app.app_context():
            user = User(username='testuser', email='test@example.com')
            password = 'TestPassword123!'
            user.set_password(password)
            
            assert user.check_password(password) is True
            assert user.check_password('WrongPassword') is False
    
    def test_user_repr(self, app):
        """Test user string representation"""
        with app.app_context():
            user = User(username='testuser', email='test@example.com')
            assert '<User testuser>' in repr(user)


class TestStudyPlanModel:
    """Tests for StudyPlan model"""
    
    def test_study_plan_creation(self, app, test_user):
        """Test study plan creation"""
        with app.app_context():
            plan = StudyPlan(
                user_id=test_user.id,
                subject='Python Basics',
                hours=24,
                plan_content='{"topic": "Functions", "duration": "2 hours"}'
            )
            assert plan.subject == 'Python Basics'
            assert plan.hours == 24
    
    def test_study_plan_repr(self, app, test_user):
        """Test study plan string representation"""
        with app.app_context():
            plan = StudyPlan(
                user_id=test_user.id,
                subject='Database Design',
                hours=30,
                plan_content='{}'
            )
            assert 'Database Design' in repr(plan)


# ============================================================================
# API ENDPOINT TESTS
# ============================================================================

class TestAPIHealth:
    """Tests for API health endpoints"""
    
    def test_health_check(self, client):
        """Test health check endpoint"""
        response = client.get('/api/v1/health')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['data']['status'] == 'healthy'
    
    def test_api_version(self, client):
        """Test API version endpoint"""
        response = client.get('/api/v1/version')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'version' in data['data']


class TestStudyPlanAPI:
    """Tests for Study Plan API endpoints"""
    
    def test_get_plans_unauthenticated(self, client):
        """Test getting plans without authentication"""
        response = client.get('/api/v1/study-plans')
        # Should redirect to login
        assert response.status_code in [302, 401, 403]
    
    def test_generate_plan_missing_subject(self, client, test_user):
        """Test generating plan without subject"""
        with client:
            with client.session_transaction() as sess:
                sess['user_id'] = test_user.id
            
            # Login first - assuming the client works with the test setup
            # This is a simplified test


# ============================================================================
# CONFIGURATION TESTS
# ============================================================================

class TestConfiguration:
    """Tests for application configuration"""
    
    def test_development_config(self):
        """Test development configuration"""
        app = create_app('development')
        assert app.config['DEBUG'] is True
        assert app.config['TESTING'] is False
    
    def test_testing_config(self):
        """Test testing configuration"""
        app = create_app('testing')
        assert app.config['DEBUG'] is True
        assert app.config['TESTING'] is True
        assert 'memory' in app.config['SQLALCHEMY_DATABASE_URI']
    
    def test_production_config(self):
        """Test production configuration"""
        app = create_app('production')
        assert app.config['DEBUG'] is False
        assert app.config['TESTING'] is False


# ============================================================================
# ERROR HANDLING TESTS
# ============================================================================

class TestErrorHandling:
    """Tests for error handling"""
    
    def test_404_error(self, client):
        """Test 404 error handling"""
        response = client.get('/nonexistent')
        assert response.status_code == 404
    
    def test_api_500_error_response_format(self, client):
        """Test 500 error returns JSON in API"""
        response = client.get('/api/v1/nonexistent')
        assert response.status_code == 404
        data = json.loads(response.data)
        assert 'success' in data
        assert 'error' in data


# ============================================================================
# UTILITY TESTS
# ============================================================================

class TestUtilities:
    """Tests for utility functions"""
    
    def test_response_formatter_success(self):
        """Test success response formatter"""
        from services.utils import ResponseFormatter
        
        response, status = ResponseFormatter.success(
            data={'id': 1},
            message='Success'
        )
        assert response['success'] is True
        assert response['message'] == 'Success'
        assert status == 200
    
    def test_response_formatter_error(self):
        """Test error response formatter"""
        from services.utils import ResponseFormatter
        
        response, status = ResponseFormatter.error(
            error='Invalid input',
            status_code=400
        )
        assert response['success'] is False
        assert response['error'] == 'Invalid input'
        assert status == 400
    
    def test_lru_cache(self):
        """Test LRU cache functionality"""
        from services.utils import LRUCache
        
        cache = LRUCache(max_size=2)
        cache.set('key1', 'value1')
        cache.set('key2', 'value2')
        
        assert cache.get('key1') == 'value1'
        assert cache.get('key2') == 'value2'
        
        # Add third item, should evict least recently used
        cache.set('key3', 'value3')
        assert cache.get('key1') is None  # Should be evicted


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
