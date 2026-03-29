"""
Topic Extraction Module
Extracts and normalizes meaningful topics from study material using NLP
"""
import re
from typing import List, Optional, Dict
from collections import Counter


def extract_and_clean_topics(
    text: str,
    subject: str,
    top_n: int = 10,
    min_length: int = 3
) -> List[str]:
    """
    Extract meaningful topics from study material
    
    Args:
        text: Study material text
        subject: Subject name for context
        top_n: Number of top topics to return
        min_length: Minimum topic length (words)
        
    Returns:
        List of cleaned, normalized topics
    """
    if not text or not text.strip():
        return []
    
    # Combine with subject for better extraction
    full_text = f"{subject}\n{text}"
    
    # Extract potential topics using multiple strategies
    topics = set()
    
    # Strategy 1: Extract from headers/important lines
    topics.update(_extract_from_headers(text))
    
    # Strategy 2: Extract noun phrases
    topics.update(_extract_noun_phrases(text, min_length))
    
    # Strategy 3: Extract from keyword patterns
    topics.update(_extract_keyword_patterns(text, subject))
    
    # Strategy 4: Extract from common technical terms
    topics.update(_extract_technical_terms(text, subject))
    
    # Clean and normalize
    cleaned_topics = _normalize_topics(list(topics))
    
    # Rank by importance
    ranked_topics = _rank_topics(cleaned_topics, text)
    
    return ranked_topics[:top_n]


def _extract_from_headers(text: str) -> set:
    """Extract topics from header-like lines"""
    topics = set()
    
    # Lines starting with #, ##, ###
    markdown_headers = re.findall(r'^#+\s+(.+?)$', text, re.MULTILINE)
    topics.update(markdown_headers)
    
    # Lines ending with colon (common header style)
    colon_headers = re.findall(r'^([^:\n]+):\s*$', text, re.MULTILINE)
    topics.update(colon_headers)
    
    # Lines in ALL CAPS (potential topics)
    caps_lines = re.findall(r'^([A-Z][A-Z\s]+)$', text, re.MULTILINE)
    topics.update(caps_lines)
    
    return topics


def _extract_noun_phrases(text: str, min_length: int = 3) -> set:
    """Extract noun phrases using simple pattern matching"""
    topics = set()
    
    # Simple pattern: Capital Letter + (word )* word
    noun_patterns = re.findall(r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b', text)
    
    # Filter by word count and uniqueness
    for phrase in noun_patterns:
        words = phrase.split()
        if min_length <= len(words) <= 4:
            topics.add(phrase)
    
    return topics


def _extract_keyword_patterns(text: str, subject: str) -> set:
    """Extract topics based on common educational keywords"""
    topics = set()
    
    # Keywords that often precede topics
    keywords = [
        r'(?:introduction to|learn|explore|understand|study)\s+([^.!?\n]+)',
        r'(?:chapter|unit|module|section|topic|lesson)\s+[:—]\s*([^.!?\n]+)',
        r'(?:concept|principle|theory|method|technique)\s+(?:of|in)\s+([^.!?\n]+)',
        r'(?:^|\n)([A-Z][a-z]+(?:\s+[a-z]+)*)\s+(?:is|are|definition|means)',
    ]
    
    for keyword_pattern in keywords:
        matches = re.findall(keyword_pattern, text, re.IGNORECASE)
        for match in matches:
            match_text = match if isinstance(match, str) else match[0]
            topics.add(match_text)
    
    return topics


def _extract_technical_terms(text: str, subject: str) -> set:
    """Extract domain-specific technical terms"""
    topics = set()
    
    # Common subject-specific terms
    subject_lower = subject.lower()
    
    # Mathematics/CS patterns
    if any(word in subject_lower for word in ['math', 'calculus', 'algebra', 'python', 'programming']):
        patterns = [
            r'\b(?:function|variable|equation|algorithm|array|loop|recursion|matrix|vector)\b',
            r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b(?:\s*\(|\s*=)',
        ]
        for pattern in patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            topics.update(matches)
    
    # Science patterns
    if any(word in subject_lower for word in ['biology', 'chemistry', 'physics', 'science']):
        patterns = [
            r'\b(?:atom|molecule|cell|reaction|force|energy|particle|element)\b',
        ]
        for pattern in patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            topics.update(matches)
    
    return topics


def _normalize_topics(topics: List[str]) -> List[str]:
    """Clean and normalize topic strings"""
    normalized = []
    seen = set()
    
    for topic in topics:
        # Clean whitespace
        topic = topic.strip()
        
        # Skip empty or very short
        if len(topic) < 3:
            continue
        
        # Skip common stopwords as standalone topics
        stopwords = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for'}
        if topic.lower() in stopwords:
            continue
        
        # Normalize case
        topic = _smart_case(topic)
        
        # Avoid duplicates (case-insensitive)
        topic_lower = topic.lower()
        if topic_lower not in seen:
            normalized.append(topic)
            seen.add(topic_lower)
    
    return normalized


def _smart_case(text: str) -> str:
    """Apply smart capitalization"""
    # If all uppercase, title case it
    if text.isupper() and len(text) > 1:
        return text.title()
    
    # If starts with lowercase, capitalize
    if text and text[0].islower():
        return text[0].upper() + text[1:]
    
    return text


def _rank_topics(topics: List[str], text: str) -> List[str]:
    """Rank topics by frequency and importance in text"""
    text_lower = text.lower()
    
    scores = {}
    for topic in topics:
        topic_lower = topic.lower()
        
        # Count exact mentions
        count = text_lower.count(topic_lower)
        
        # Boost score for capitalized mentions (importance)
        cap_count = text.count(topic)
        
        # Boost for early appearance in text
        pos = text_lower.find(topic_lower)
        if pos >= 0:
            position_boost = 1.0 - (pos / len(text)) * 0.5
        else:
            position_boost = 0.5
        
        # Combined score
        score = (count * 2) + cap_count + position_boost
        scores[topic] = score
    
    # Sort by score descending
    sorted_topics = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    return [topic for topic, _ in sorted_topics]


def extract_topic_context(topic: str, text: str, context_window: int = 200) -> str:
    """
    Extract surrounding context for a topic from text
    
    Args:
        topic: The topic to find context for
        text: The source text
        context_window: Characters before/after to include
        
    Returns:
        Context string
    """
    pattern = re.escape(topic)
    match = re.search(pattern, text, re.IGNORECASE)
    
    if not match:
        return f"Information about {topic}"
    
    start = max(0, match.start() - context_window)
    end = min(len(text), match.end() + context_window)
    
    context = text[start:end]
    return context


def get_topics_summary(topics: List[str]) -> Dict[str, int]:
    """Get summary statistics about extracted topics"""
    return {
        "total_topics": len(topics),
        "avg_topic_length": sum(len(t.split()) for t in topics) / len(topics) if topics else 0,
    }
