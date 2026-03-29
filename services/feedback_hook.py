"""
Feedback Hook Module
Structure and interface for feedback integration and adaptive learning
"""
from typing import Dict, List, Optional
from datetime import datetime


class FeedbackCollector:
    """Collects learning feedback to adapt future study plans"""
    
    def __init__(self):
        self.feedback_data = []
        self.topic_scores = {}
        self.learning_effectiveness = {}
    
    def record_quiz_result(
        self,
        topic: str,
        score: float,
        total_questions: int,
        time_taken_minutes: int
    ) -> None:
        """
        Record quiz/test results
        
        Args:
            topic: Topic being tested
            score: Score achieved (0-100)
            total_questions: Number of questions
            time_taken_minutes: Time taken to complete
        """
        feedback = {
            'type': 'quiz_result',
            'topic': topic,
            'score': score,
            'total_questions': total_questions,
            'time_taken_minutes': time_taken_minutes,
            'mastery_level': self._calculate_mastery(score),
            'timestamp': datetime.now().isoformat()
        }
        
        self.feedback_data.append(feedback)
        self._update_topic_score(topic, score)
    
    def record_practice_session(
        self,
        topic: str,
        problems_solved: int,
        success_rate: float,
        time_spent_minutes: int
    ) -> None:
        """
        Record practice session completion
        
        Args:
            topic: Topic practiced
            problems_solved: Number of problems attempted
            success_rate: Percentage solved correctly
            time_spent_minutes: Time spent on practice
        """
        feedback = {
            'type': 'practice_session',
            'topic': topic,
            'problems_solved': problems_solved,
            'success_rate': success_rate,
            'time_spent_minutes': time_spent_minutes,
            'efficiency': self._calculate_efficiency(problems_solved, time_spent_minutes),
            'timestamp': datetime.now().isoformat()
        }
        
        self.feedback_data.append(feedback)
        self._update_topic_score(topic, success_rate)
    
    def record_user_reflection(
        self,
        topic: str,
        confidence_level: int,
        notes: str
    ) -> None:
        """
        Record user's self-assessment
        
        Args:
            topic: Topic being assessed
            confidence_level: 1-5 confidence level
            notes: User's notes/reflection
        """
        feedback = {
            'type': 'user_reflection',
            'topic': topic,
            'confidence_level': confidence_level,
            'notes': notes,
            'timestamp': datetime.now().isoformat()
        }
        
        self.feedback_data.append(feedback)
    
    def _calculate_mastery(self, score: float) -> str:
        """Determine mastery level from score"""
        if score >= 90:
            return 'mastered'
        elif score >= 75:
            return 'proficient'
        elif score >= 60:
            return 'developing'
        else:
            return 'needs_work'
    
    def _calculate_efficiency(self, problems_solved: int, time_minutes: int) -> float:
        """Calculate problems solved per minute"""
        if time_minutes == 0:
            return 0
        return problems_solved / time_minutes
    
    def _update_topic_score(self, topic: str, score: float) -> None:
        """Update running score for topic"""
        if topic not in self.topic_scores:
            self.topic_scores[topic] = []
        self.topic_scores[topic].append(score)


def identify_weak_areas(feedback_data: List[Dict], topic_scores: Dict) -> List[str]:
    """
    Identify topics needing more study
    
    Args:
        feedback_data: Collected feedback
        topic_scores: Topic scores from feedback
        
    Returns:
        List of topics to focus on
    """
    weak_topics = []
    
    for topic, scores in topic_scores.items():
        avg_score = sum(scores) / len(scores) if scores else 100
        
        if avg_score < 75:
            weak_topics.append(topic)
    
    return weak_topics


def recommend_plan_adjustments(feedback_data: List[Dict]) -> Dict:
    """
    Recommend adjustments to study plan based on feedback
    
    Args:
        feedback_data: Collected feedback
        
    Returns:
        Recommendations for plan adjustment
    """
    recommendations = {
        'topics_to_review': [],
        'topics_progressing_well': [],
        'strategy_changes': {},
        'time_allocation_changes': {},
        'overall_feedback': ''
    }
    
    if not feedback_data:
        recommendations['overall_feedback'] = 'No feedback data yet. Continue following the plan.'
        return recommendations
    
    # Analyze feedback patterns
    quiz_results = [f for f in feedback_data if f['type'] == 'quiz_result']
    practice_sessions = [f for f in feedback_data if f['type'] == 'practice_session']
    
    if quiz_results:
        avg_quiz_score = sum(f['score'] for f in quiz_results) / len(quiz_results)
        
        if avg_quiz_score < 60:
            recommendations['overall_feedback'] = 'Your quiz scores are lower than expected. Consider spending more time on fundamentals.'
        elif avg_quiz_score < 75:
            recommendations['overall_feedback'] = 'Good progress! Focus on areas needing improvement.'
        else:
            recommendations['overall_feedback'] = 'Excellent work! You\'re progressing well through the material.'
    
    # Identify specific topics
    for feedback in quiz_results:
        if feedback['mastery_level'] == 'needs_work':
            recommendations['topics_to_review'].append(feedback['topic'])
        elif feedback['mastery_level'] in ['mastered', 'proficient']:
            recommendations['topics_progressing_well'].append(feedback['topic'])
    
    return recommendations


def calculate_learning_effectiveness(
    feedback_data: List[Dict],
    time_invested_minutes: int
) -> float:
    """
    Calculate overall learning effectiveness score
    
    Args:
        feedback_data: Collected feedback
        time_invested_minutes: Total time spent learning
        
    Returns:
        Effectiveness score (0-100)
    """
    if not feedback_data or time_invested_minutes == 0:
        return 50  # Default neutral score
    
    # Aggregate scores from feedback
    scores = []
    
    for feedback in feedback_data:
        if feedback['type'] == 'quiz_result':
            scores.append(feedback['score'])
        elif feedback['type'] == 'practice_session':
            scores.append(feedback['success_rate'])
        elif feedback['type'] == 'user_reflection':
            scores.append(feedback['confidence_level'] * 20)
    
    if not scores:
        return 50
    
    avg_score = sum(scores) / len(scores)
    
    # Adjust based on time efficiency
    feedback_entries = len(feedback_data)
    pace = feedback_entries / (time_invested_minutes / 60) if time_invested_minutes > 0 else 0
    
    # Combine average score with pace effectiveness
    effectiveness = (avg_score * 0.7) + (min(pace * 10, 30) * 0.3)
    
    return min(effectiveness, 100)


def predict_plan_completion(
    current_progress: float,
    current_day: int,
    total_days: int,
    learning_effectiveness: float
) -> Dict:
    """
    Predict likelihood of completing plan successfully
    
    Args:
        current_progress: Percentage complete (0-100)
        current_day: Current day in plan
        total_days: Total days in plan
        learning_effectiveness: Learning effectiveness score
        
    Returns:
        Prediction data
    """
    days_remaining = total_days - current_day
    progress_needed = 100 - current_progress
    
    if days_remaining <= 0:
        return {
            'status': 'completed',
            'completion_likelihood': 100,
            'message': 'Study plan completed!'
        }
    
    # Calculate required daily progress
    required_daily_progress = progress_needed / days_remaining
    
    # Compare with learning effectiveness
    if learning_effectiveness >= 80:
        completion_likelihood = min(100, 75 + (learning_effectiveness - 80) * 5)
    elif learning_effectiveness >= 60:
        completion_likelihood = min(100, 50 + (learning_effectiveness - 60) * 1.25)
    else:
        completion_likelihood = max(25, learning_effectiveness)
    
    status = 'on_track' if completion_likelihood >= 70 else 'at_risk' if completion_likelihood >= 50 else 'off_track'
    
    return {
        'status': status,
        'completion_likelihood': round(completion_likelihood, 1),
        'days_remaining': days_remaining,
        'required_daily_progress': round(required_daily_progress, 1),
        'message': _get_completion_message(status, completion_likelihood)
    }


def _get_completion_message(status: str, likelihood: float) -> str:
    """Generate message based on completion status"""
    if status == 'completed':
        return 'Plan completed successfully!'
    elif status == 'on_track':
        return f'Great! You\'re on track to complete the plan ({likelihood}% likely)'
    elif status == 'at_risk':
        return f'You might need to increase study hours to complete on time ({likelihood}% likely)'
    else:
        return f'Consider adjusting your study pace to complete the plan ({likelihood}% likely)'


def get_next_focus_area(feedback_data: List[Dict]) -> Optional[str]:
    """
    Recommend the next area to focus on
    
    Args:
        feedback_data: Collected feedback
        
    Returns:
        Recommended topic to focus on
    """
    if not feedback_data:
        return None
    
    recent_results = feedback_data[-5:]  # Look at last 5 entries
    topic_performance = {}
    
    for feedback in recent_results:
        topic = feedback.get('topic')
        if feedback['type'] == 'quiz_result':
            score = feedback['score']
        elif feedback['type'] == 'practice_session':
            score = feedback['success_rate']
        else:
            score = feedback.get('confidence_level', 3) * 20
        
        if topic not in topic_performance:
            topic_performance[topic] = []
        topic_performance[topic].append(score)
    
    # Find lowest performing topic
    avg_scores = {t: sum(s) / len(s) for t, s in topic_performance.items()}
    
    if avg_scores:
        return min(avg_scores, key=avg_scores.get)
    
    return None
