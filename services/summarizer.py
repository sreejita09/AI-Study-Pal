import re
from .file_parser import extract_topics

def generate_summary(text: str) -> str:
    if not text:
        return 'No text to summarize.'
    
    sentences = re.split(r'[.!?]\s+', text)
    topics = extract_topics(text)
    
    # Bullet points: key sentences and topics
    bullets = []
    for topic in topics[:5]:
        bullets.append(f'• {topic}')
    
    # Add 2-3 key sentences
    key_sentences = [s for s in sentences if len(s.split()) > 10][:3]
    for sent in key_sentences:
        bullets.append(f'• {sent[:150]}...')
    
    summary = 'Summary:\n' + '\n'.join(bullets)
    return summary