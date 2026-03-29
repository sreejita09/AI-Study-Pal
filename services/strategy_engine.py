"""
Strategy Engine Module
Maps subject/topic types and difficulty to learning strategies
"""
from typing import Literal, List, Dict


def map_learning_strategy(
    subject_type: str,
    topic: str,
    difficulty: str
) -> str:
    """
    Map subject type + topic type to learning strategy
    
    Args:
        subject_type: Type of subject (problem_solving, conceptual, theory, practical)
        topic: Topic name
        difficulty: Difficulty level (easy, medium, hard)
        
    Returns:
        Learning strategy name
    """
    strategies = {
        ('problem_solving', 'easy'): 'learn-by-doing',
        ('problem_solving', 'medium'): 'practice-heavy',
        ('problem_solving', 'hard'): 'active-recall',
        
        ('conceptual', 'easy'): 'active-recall',
        ('conceptual', 'medium'): 'mixed',
        ('conceptual', 'hard'): 'active-recall',
        
        ('theory', 'easy'): 'active-recall',
        ('theory', 'medium'): 'spaced-repetition',
        ('theory', 'hard'): 'active-recall',
        
        ('practical', 'easy'): 'learn-by-doing',
        ('practical', 'medium'): 'practice-heavy',
        ('practical', 'hard'): 'learn-by-doing',
    }
    
    # Topic-specific overrides
    topic_lower = topic.lower()
    
    if any(word in topic_lower for word in ['introduction', 'overview', 'basics']):
        return 'active-recall'
    elif any(word in topic_lower for word in ['practice', 'exercise', 'problem']):
        return 'practice-heavy'
    elif any(word in topic_lower for word in ['project', 'implementation', 'build']):
        return 'learn-by-doing'
    elif any(word in topic_lower for word in ['theory', 'proof', 'concept']):
        return 'active-recall'
    
    # Default based on mapping
    key = (subject_type, difficulty)
    return strategies.get(key, 'mixed')


def get_learning_strategies() -> Dict[str, Dict]:
    """
    Get detailed description of all learning strategies
    
    Returns:
        Dictionary with strategy details and characteristics
    """
    return {
        'active-recall': {
            'name': 'Active Recall',
            'description': 'Quiz yourself without looking at notes. Retrieve information from memory.',
            'effectiveness': 0.95,
            'best_for': ['conceptual', 'theory', 'memorization'],
            'time_spent': {'reading': 0.2, 'practice': 0.8},
            'activities': [
                'Create flashcards',
                'Self-quiz without notes',
                'Teach others',
                'Summarize from memory',
                'Practice retrieval'
            ]
        },
        'spaced-repetition': {
            'name': 'Spaced Repetition',
            'description': 'Review content at increasing intervals (1 day, 3 days, 7 days, etc.)',
            'effectiveness': 0.90,
            'best_for': ['memorization', 'theory', 'factual knowledge'],
            'time_spent': {'reading': 0.3, 'review': 0.7},
            'activities': [
                'Day 1: Initial review',
                'Day 3: First repetition',
                'Day 7: Second repetition',
                'Day 14: Third repetition',
                'Day 30: Final review'
            ]
        },
        'practice-heavy': {
            'name': 'Practice-Heavy',
            'description': 'Solve many problems, exercises, and practice examples.',
            'effectiveness': 0.92,
            'best_for': ['problem_solving', 'practical', 'skills'],
            'time_spent': {'learning': 0.2, 'practice': 0.8},
            'activities': [
                'Solve 10+ practice problems',
                'Work through examples',
                'Attempt variations of problems',
                'Debug and refine solutions',
                'Compare with solutions'
            ]
        },
        'learn-by-doing': {
            'name': 'Learn-by-Doing',
            'description': 'Build projects, implement code, apply concepts immediately.',
            'effectiveness': 0.88,
            'best_for': ['programming', 'practical skills', 'engineering'],
            'time_spent': {'learning': 0.1, 'building': 0.9},
            'activities': [
                'Build a small project',
                'Implement code from scratch',
                'Debug your own code',
                'Modify and experiment',
                'Deploy or present results'
            ]
        },
        'mixed': {
            'name': 'Mixed Strategy',
            'description': 'Combine multiple strategies: reading, practice, recall, and doing.',
            'effectiveness': 0.85,
            'best_for': ['general', 'comprehensive learning', 'diverse topics'],
            'time_spent': {'reading': 0.2, 'practice': 0.4, 'recall': 0.2, 'doing': 0.2},
            'activities': [
                'Read and take notes',
                'Solve practice problems',
                'Active recall exercises',
                'Build mini-projects',
                'Review and consolidate'
            ]
        },
        'guided-discovery': {
            'name': 'Guided Discovery',
            'description': 'Follow structured examples, then solve similar problems independently.',
            'effectiveness': 0.87,
            'best_for': ['beginners', 'complex topics', 'step-by-step learning'],
            'time_spent': {'guided': 0.5, 'independent': 0.5},
            'activities': [
                'Study worked examples',
                'Follow step-by-step guides',
                'Solve similar problems',
                'Try variations',
                'Create your own examples'
            ]
        }
    }


def get_strategy_activities(strategy: str, difficulty: str, topic: str) -> List[str]:
    """
    Get specific activities for a strategy, difficulty, and topic
    
    Args:
        strategy: Learning strategy name
        difficulty: Topic difficulty
        topic: Topic name
        
    Returns:
        List of specific activities
    """
    strategies = get_learning_strategies()
    
    if strategy not in strategies:
        strategy = 'mixed'
    
    base_activities = strategies[strategy]['activities']
    
    # Customize based on difficulty
    customized = []
    for activity in base_activities:
        if difficulty == 'hard':
            activity = activity.replace('1', '3').replace('10+', '20+')
        elif difficulty == 'easy':
            activity = activity.replace('10+', '5+')
        
        customized.append(activity)
    
    return customized


def get_time_allocation_for_strategy(
    strategy: str,
    total_minutes: int
) -> Dict[str, int]:
    """
    Get time allocation breakdown for a strategy
    
    Args:
        strategy: Learning strategy name
        total_minutes: Total time available
        
    Returns:
        Dictionary with time for each activity type
    """
    strategies = get_learning_strategies()
    
    if strategy not in strategies:
        strategy = 'mixed'
    
    time_spent = strategies[strategy]['time_spent']
    
    allocation = {}
    for activity_type, proportion in time_spent.items():
        allocation[activity_type] = int(total_minutes * proportion)
    
    return allocation


def is_strategy_suitable_for_difficulty(strategy: str, difficulty: str) -> bool:
    """Check if a strategy is suitable for the given difficulty"""
    suitability = {
        'active-recall': ['easy', 'medium', 'hard'],
        'spaced-repetition': ['easy', 'medium', 'hard'],
        'practice-heavy': ['medium', 'hard'],
        'learn-by-doing': ['easy', 'medium', 'hard'],
        'mixed': ['easy', 'medium', 'hard'],
        'guided-discovery': ['easy', 'medium']
    }
    
    return difficulty in suitability.get(strategy, [])


def select_best_strategy(subject_type: str, difficulty: str, learning_style: str = 'balanced') -> str:
    """
    Select best strategy based on multiple factors
    
    Args:
        subject_type: Type of subject
        difficulty: Difficulty level
        learning_style: User's learning style (visual, kinesthetic, reading, balanced)
        
    Returns:
        Recommended strategy
    """
    # Base strategy from subject and difficulty
    base_strategy = map_learning_strategy(subject_type, '', difficulty)
    
    # Adjust based on learning style
    if learning_style == 'visual':
        if subject_type == 'practical':
            return 'learn-by-doing'
        return base_strategy
    elif learning_style == 'kinesthetic':
        return 'learn-by-doing'
    elif learning_style == 'reading':
        return 'active-recall'
    
    return base_strategy
