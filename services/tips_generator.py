import nltk
from nltk.tokenize import word_tokenize
from nltk.corpus import stopwords
from .file_parser import estimate_difficulty

nltk.download('punkt')
nltk.download('stopwords')

def generate_tips(text: str) -> str:
    if not text:
        return 'Upload content to get personalized tips.'
    
    tokens = word_tokenize(text.lower())
    stop_words = set(stopwords.words('english'))
    keywords = [w for w in tokens if w.isalnum() and w not in stop_words][:10]
    
    difficulty = estimate_difficulty(text)
    tips = []
    
    if difficulty == 'hard':
        tips.append('Break down complex topics into smaller parts.')
        tips.append('Use diagrams and examples for visualization.')
    elif difficulty == 'medium':
        tips.append('Practice with related problems.')
        tips.append('Review key formulas or concepts daily.')
    else:
        tips.append('Focus on understanding basics.')
        tips.append('Quick quizzes for retention.')
    
    tips.append(f'Key terms to focus: {", ".join(keywords)}.')
    tips.append('Use active recall: test yourself without notes.')
    
    return 'Study Tips:\n' + '\n'.join(f'• {tip}' for tip in tips)