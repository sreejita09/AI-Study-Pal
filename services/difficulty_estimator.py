"""
Difficulty Estimation Module
Estimates difficulty of topics and content
"""
from typing import Literal, Dict, Optional
import re


def estimate_topic_difficulty(
    topic: str,
    text: str,
    subject_type: str
) -> Literal['easy', 'medium', 'hard']:
    """
    Estimate difficulty of a topic
    
    Args:
        topic: Topic name
        text: Full study material text
        subject_type: Classification of the subject
        
    Returns:
        Difficulty level: 'easy', 'medium', or 'hard'
    """
    scores = {
        'easy': 0,
        'medium': 0,
        'hard': 0
    }
    
    # Factor 1: Topic complexity keywords
    easy_keywords = ['basic', 'introduction', 'fundamental', 'beginner', 'simple', 'overview']
    medium_keywords = ['intermediate', 'advanced fundamentals', 'application', 'practice']
    hard_keywords = ['advanced', 'expert', 'complex', 'challenging', 'deep dive', 'theory']
    
    topic_lower = topic.lower()
    
    for keyword in easy_keywords:
        if keyword in topic_lower:
            scores['easy'] += 2
    for keyword in medium_keywords:
        if keyword in topic_lower:
            scores['medium'] += 2
    for keyword in hard_keywords:
        if keyword in topic_lower:
            scores['hard'] += 2
    
    # Factor 2: Subject type baseline
    subject_type_difficulty = {
        'problem_solving': {'easy': 0, 'medium': 1, 'hard': 1},
        'theory': {'easy': 0, 'medium': 1, 'hard': 2},
        'practical': {'easy': 1, 'medium': 1, 'hard': 0},
        'conceptual': {'easy': 0, 'medium': 1, 'hard': 1},
    }
    
    difficulty_baseline = subject_type_difficulty.get(subject_type, {'easy': 0, 'medium': 1, 'hard': 0})
    for level, boost in difficulty_baseline.items():
        scores[level] += boost
    
    # Factor 3: Text analysis for the topic
    text_lower = text.lower()
    topic_lower_exact = topic.lower()
    
    # Find section about this topic
    topic_section = _extract_topic_section(topic, text)
    
    if topic_section:
        # Analyze complexity of the section
        section_difficulty = _analyze_text_complexity(topic_section)
        scores[section_difficulty] += 2
    
    # Factor 4: Topic dependencies
    topic_dependencies = _count_topic_dependencies(topic)
    if topic_dependencies > 2:
        scores['hard'] += 1
    elif topic_dependencies > 0:
        scores['medium'] += 1
    
    # Determine final difficulty
    final_difficulty = max(scores, key=scores.get)
    
    # Normalize scores for consistency
    if scores['medium'] > scores[final_difficulty] * 0.8:
        return 'medium'
    
    return final_difficulty


def estimate_overall_difficulty(topics: list, text: str, subject_type: str) -> str:
    """
    Estimate overall difficulty of study material
    
    Args:
        topics: List of topics
        text: Study material text
        subject_type: Subject classification
        
    Returns:
        Overall difficulty level
    """
    if not topics:
        return 'medium'
    
    difficulties = []
    for topic in topics:
        diff = estimate_topic_difficulty(topic, text, subject_type)
        difficulties.append(diff)
    
    # Score each level
    easy_count = difficulties.count('easy')
    medium_count = difficulties.count('medium')
    hard_count = difficulties.count('hard')
    
    # Determine overall difficulty
    if hard_count > len(difficulties) * 0.4:
        return 'hard'
    elif hard_count > 0 or medium_count > len(difficulties) * 0.5:
        return 'medium'
    else:
        return 'easy'


def _extract_topic_section(topic: str, text: str, context_window: int = 500) -> Optional[str]:
    """Extract section of text related to topic"""
    topic_lower = topic.lower()
    text_lower = text.lower()
    
    # Find occurrence of topic
    pos = text_lower.find(topic_lower)
    if pos < 0:
        return None
    
    # Extract context
    start = max(0, pos - context_window)
    end = min(len(text), pos + context_window)
    
    return text[start:end]


def _analyze_text_complexity(text: str) -> str:
    """Analyze text complexity based on metrics"""
    if not text:
        return 'easy'
    
    words = text.split()
    if not words:
        return 'easy'
    
    # Metrics
    avg_word_length = sum(len(w) for w in words) / len(words)
    sentence_count = len(re.split(r'[.!?]', text))
    
    # Technical term indicators
    technical_indicators = 0
    technical_patterns = [
        r'\b[a-z]+_[a-z]+\b',  # snake_case
        r'\b[A-Z][a-zA-Z]+[A-Z]\b',  # camelCase or PascalCase
        r'\(.*?\)',  # parentheses with parameters
        r'\[.*?\]',  # brackets
        r'\{.*?\}',  # braces
        r'==|!=|<=|>=|&&|\\|\\|',  # operators
    ]
    
    for pattern in technical_patterns:
        technical_indicators += len(re.findall(pattern, text))
    
    # Decision tree
    if avg_word_length > 6 and technical_indicators > 3:
        return 'hard'
    elif avg_word_length > 5 or technical_indicators > 1:
        return 'medium'
    else:
        return 'easy'


def _count_topic_dependencies(topic: str) -> int:
    """Estimate number of prerequisite topics"""
    topic_lower = topic.lower()
    
    # Topics that typically depend on other topics
    dependent_patterns = {
        'advanced': 2,
        'intermediate': 1,
        'machine learning': 3,
        'deep learning': 3,
        'calculus': 1,
        'regression': 2,
        'neural': 2,
    }
    
    for pattern, count in dependent_patterns.items():
        if pattern in topic_lower:
            return count
    
    return 0


def get_difficulty_score(difficulty: str) -> int:
    """Convert difficulty to numeric score (1-3)"""
    difficulty_map = {
        'easy': 1,
        'medium': 2,
        'hard': 3
    }
    return difficulty_map.get(difficulty, 2)


def difficulty_to_learning_time_multiplier(difficulty: str) -> float:
    """Get time multiplier based on difficulty"""
    multipliers = {
        'easy': 1.0,
        'medium': 1.5,
        'hard': 2.5
    }
    return multipliers.get(difficulty, 1.5)


def estimate_problem_complexity(problem_text: str) -> str:
    """Estimate complexity of a specific problem"""
    text_lower = problem_text.lower()
    
    # Hard problem indicators
    hard_indicators = ['prove', 'derive', 'optimize', 'complex', 'edge case', 'constraint']
    # Medium indicators
    medium_indicators = ['find', 'calculate', 'solve', 'determine', 'implement']
    # Easy indicators
    easy_indicators = ['list', 'identify', 'name', 'define', 'explain']
    
    hard_score = sum(1 for indicator in hard_indicators if indicator in text_lower)
    medium_score = sum(1 for indicator in medium_indicators if indicator in text_lower)
    easy_score = sum(1 for indicator in easy_indicators if indicator in text_lower)
    
    if hard_score > medium_score and hard_score > easy_score:
        return 'hard'
    elif medium_score > easy_score:
        return 'medium'
    else:
        return 'easy'
