from .file_parser import estimate_difficulty

def generate_feedback(hours: int, text: str = None) -> str:
    difficulty = estimate_difficulty(text) if text else 'easy'
    
    if difficulty == 'hard' and hours > 5:
        feedback = 'You\'re tackling challenging material with dedication. Great job!'
    elif hours > 10:
        feedback = 'Impressive study hours! Consistency is key to mastery.'
    elif difficulty == 'easy':
        feedback = 'Building strong foundations. Keep up the momentum!'
    else:
        feedback = 'Steady progress is the way to success. You\'re on track!'
    
    return f'Motivational Feedback:\n{feedback}'