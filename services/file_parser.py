import os
import re
from typing import Optional

def extract_text_from_file(upload) -> Optional[str]:
    if not upload or upload.filename == '':
        return None
    filename = upload.filename.lower()
    try:
        if filename.endswith('.txt') or filename.endswith('.md'):
            return upload.read().decode('utf-8', errors='ignore')
        elif filename.endswith('.csv'):
            import pandas as pd
            df = pd.read_csv(upload)
            if 'text' in df.columns:
                return '\n'.join(df['text'].astype(str).tolist())
            return '\n'.join(df.astype(str).agg(' '.join, axis=1).tolist())
        elif filename.endswith('.pdf'):
            import fitz  # PyMuPDF
            doc = fitz.open(stream=upload.read(), filetype="pdf")
            text = ""
            for page in doc:
                text += page.get_text()
            return text
        elif filename.endswith('.docx'):
            from docx import Document
            doc = Document(upload)
            text = ""
            for para in doc.paragraphs:
                text += para.text + "\n"
            return text
        elif filename.endswith(('.jpg', '.jpeg', '.png')):
            import pytesseract
            from PIL import Image
            import io
            image = Image.open(io.BytesIO(upload.read()))
            text = pytesseract.image_to_string(image)
            return text
    except Exception as e:
        return f'Error extracting text: {str(e)}'
    return None

def extract_topics(text: str) -> list:
    if not text:
        return []
    # Simple topic extraction: sentences starting with capital or containing keywords
    sentences = re.split(r'[.!?]\s+', text)
    topics = []
    for sent in sentences:
        sent = sent.strip()
        if sent and (sent[0].isupper() or any(word in sent.lower() for word in ['chapter', 'section', 'topic', 'unit'])):
            topics.append(sent[:100])  # Limit length
    return topics[:10]  # Top 10

def estimate_difficulty(text: str) -> str:
    if not text:
        return 'easy'
    words = text.split()
    avg_word_len = sum(len(w) for w in words) / len(words) if words else 0
    complex_words = [w for w in words if len(w) > 6]
    score = len(complex_words) / len(words) if words else 0
    if score > 0.2 or avg_word_len > 5:
        return 'hard'
    elif score > 0.1:
        return 'medium'
    return 'easy'