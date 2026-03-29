import re
from .file_parser import extract_topics

def generate_quiz(text: str, difficulty: str = 'easy') -> list:
    if not text:
        return [{'question': 'No content provided.', 'options': [], 'answer': ''}]
    
    sentences = re.split(r'[.!?]\s+', text)
    questions = []
    num_questions = 5 if difficulty == 'easy' else 10
    
    for i, sent in enumerate(sentences[:num_questions]):
        sent = sent.strip()
        if len(sent.split()) < 5:
            continue
        # Simple MCQ: Use sentence as question, extract answer from context
        question = f'What is the main idea of: "{sent[:100]}..."?'
        # Distractors: similar words
        words = sent.split()
        if len(words) > 3:
            correct = words[2] if len(words) > 2 else words[0]
            distractors = [words[0], words[-1], 'None of the above']
            options = [correct] + distractors[:3]
        else:
            options = ['Option A', 'Option B', 'Option C', 'Option D']
            correct = 'Option A'
        questions.append({
            'question': question,
            'options': options,
            'answer': correct
        })
    
    return questions[:num_questions]