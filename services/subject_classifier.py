"""
Subject Classification Module
Classifies subjects into learning categories for strategy selection
"""
from typing import Tuple, Optional


def classify_subject_type(subject: str, text: str = "") -> str:
    """
    Classify subject into one of: problem_solving, conceptual, theory, practical
    
    Args:
        subject: Subject name
        text: Study material text for context
        
    Returns:
        Subject type classification
    """
    subject_lower = subject.lower()
    text_lower = text.lower()
    
    # Problem-solving subjects
    problem_solving_keywords = [
        'algorithm', 'coding', 'programming', 'problem', 'leetcode',
        'competitive', 'coding interview', 'ds algo', 'data structures',
        'software engineering', 'practice problems'
    ]
    
    # Conceptual subjects
    conceptual_keywords = [
        'concept', 'theory', 'principle', 'philosophy', 'psychology',
        'economics', 'business', 'culture', 'history', 'literature'
    ]
    
    # Theory-heavy subjects
    theory_keywords = [
        'mathematics', 'physics', 'calculus', 'algebra', 'geometry',
        'chemistry', 'biology', 'quantum', 'relativity', 'thermodynamics',
        'theoretical', 'proof', 'theorem', 'axiom'
    ]
    
    # Practical/hands-on subjects
    practical_keywords = [
        'python', 'javascript', 'web development', 'frontend', 'backend',
        'machine learning', 'data science', 'pandas', 'numpy', 'tensorflow',
        'hands-on', 'tutorial', 'project', 'implementation', 'deployment',
        'design', 'ui/ux', 'graphic'
    ]
    
    # Scoring system
    scores = {
        'problem_solving': 0,
        'conceptual': 0,
        'theory': 0,
        'practical': 0
    }
    
    # Check subject name
    for keyword in problem_solving_keywords:
        if keyword in subject_lower:
            scores['problem_solving'] += 2
    for keyword in conceptual_keywords:
        if keyword in subject_lower:
            scores['conceptual'] += 2
    for keyword in theory_keywords:
        if keyword in subject_lower:
            scores['theory'] += 2
    for keyword in practical_keywords:
        if keyword in subject_lower:
            scores['practical'] += 2
    
    # Check text if available
    if text:
        for keyword in problem_solving_keywords:
            scores['problem_solving'] += text_lower.count(keyword)
        for keyword in conceptual_keywords:
            scores['conceptual'] += text_lower.count(keyword)
        for keyword in theory_keywords:
            scores['theory'] += text_lower.count(keyword)
        for keyword in practical_keywords:
            scores['practical'] += text_lower.count(keyword)
    
    # Determine category
    if max(scores.values()) == 0:
        return 'mixed'  # Default if no matches
    
    return max(scores, key=scores.get)


def classify_topic_type(topic: str, subject_type: str, text: str = "") -> str:
    """
    Classify a specific topic into: theory, practical, concept, mixed
    
    Args:
        topic: Topic name
        subject_type: Subject type classification
        text: Study material text for context
        
    Returns:
        Topic type classification
    """
    topic_lower = topic.lower()
    text_lower = text.lower() if text else ""
    
    # Theory indicators
    theory_keywords = [
        'definition', 'concept', 'principle', 'law', 'theorem',
        'proof', 'axiom', 'formula', 'equation', 'theory',
        'explain', 'understand', 'fundamentals', 'introduction'
    ]
    
    # Practical indicators
    practical_keywords = [
        'example', 'practice', 'exercise', 'implementation',
        'code', 'project', 'task', 'problem', 'solve',
        'build', 'create', 'apply', 'step-by-step'
    ]
    
    # Score the topic
    theory_score = sum(1 for kw in theory_keywords if kw in topic_lower)
    practical_score = sum(1 for kw in practical_keywords if kw in topic_lower)
    
    # Check in text if available
    if text:
        theory_score += text_lower.count(topic_lower) if topic_lower in text_lower else 0
    
    # Determine based on subject type
    if subject_type == 'problem_solving':
        return 'practical'
    elif subject_type == 'theory':
        return 'theory'
    elif subject_type == 'practical':
        return 'practical'
    elif subject_type == 'conceptual':
        return 'concept'
    
    # Default based on keyword scores
    if theory_score > practical_score:
        return 'theory'
    elif practical_score > theory_score:
        return 'practical'
    else:
        return 'mixed'


def get_subject_characteristics(subject: str, subject_type: str) -> dict:
    """
    Get characteristics and properties of a subject
    
    Args:
        subject: Subject name
        subject_type: Subject type classification
        
    Returns:
        Dictionary with subject characteristics
    """
    characteristics = {
        'subject': subject,
        'type': subject_type,
        'requires_coding': False,
        'requires_math': False,
        'requires_memorization': False,
        'requires_practice': False,
        'requires_visualization': False,
        'estimated_difficulty': 'medium'
    }
    
    subject_lower = subject.lower()
    
    # Set characteristics based on subject
    if any(word in subject_lower for word in ['programming', 'python', 'javascript', 'code']):
        characteristics['requires_coding'] = True
        characteristics['requires_practice'] = True
    
    if any(word in subject_lower for word in ['math', 'calculus', 'algebra', 'statistics']):
        characteristics['requires_math'] = True
        characteristics['requires_practice'] = True
    
    if any(word in subject_lower for word in ['history', 'literature', 'biology', 'chemistry']):
        characteristics['requires_memorization'] = True
    
    if any(word in subject_lower for word in ['design', 'art', 'architecture', 'ui', 'visualization']):
        characteristics['requires_visualization'] = True
    
    if subject_type in ['problem_solving', 'practical']:
        characteristics['requires_practice'] = True
    
    return characteristics
