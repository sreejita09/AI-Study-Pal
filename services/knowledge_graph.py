"""
Knowledge Graph Construction Module
Builds dependency graphs and ensures prerequisite ordering of topics
"""
from typing import Dict, List, Set, Tuple


def build_knowledge_graph(topics: List[str]) -> Dict[str, Dict]:
    """
    Build a knowledge graph with topic dependencies
    
    Args:
        topics: List of topics to organize
        
    Returns:
        Dictionary representing the knowledge graph with prerequisites
    """
    graph = {}
    
    # Initialize all topics
    for topic in topics:
        graph[topic] = {
            "prerequisites": [],
            "dependents": [],
            "level": 0
        }
    
    # Common prerequisite patterns
    prerequisites = _extract_prerequisites(topics)
    
    # Build edges (prerequisites)
    for dependent, prereqs in prerequisites.items():
        if dependent in graph:
            for prereq in prereqs:
                # Find matching topic
                matched_prereq = _find_matching_topic(prereq, topics)
                if matched_prereq and matched_prereq != dependent:
                    graph[dependent]["prerequisites"].append(matched_prereq)
                    graph[matched_prereq]["dependents"].append(dependent)
    
    # Calculate levels (depth in dependency tree)
    _calculate_levels(graph)
    
    return graph


def _extract_prerequisites(topics: List[str]) -> Dict[str, List[str]]:
    """
    Extract prerequisite relationships between topics
    
    Args:
        topics: List of topics
        
    Returns:
        Dictionary mapping topics to their prerequisites
    """
    prerequisites = {}
    
    # Common prerequisite relationships (can be extended)
    known_prerequisites = {
        # Mathematics & CS
        "algebra": [],
        "calculus": ["algebra"],
        "linear algebra": ["algebra"],
        "probability": ["algebra"],
        "statistics": ["probability"],
        "data science": ["statistics", "programming"],
        "machine learning": ["statistics", "linear algebra", "python"],
        "deep learning": ["machine learning", "neural networks"],
        
        # Programming
        "variables": [],
        "data types": ["variables"],
        "functions": ["variables"],
        "oop": ["functions"],
        "classes": ["oop"],
        "inheritance": ["classes"],
        
        # Data Structure
        "arrays": [],
        "linked lists": ["arrays"],
        "trees": ["data types"],
        "graphs": ["arrays"],
        "sorting": ["arrays"],
        "searching": ["arrays"],
        
        # Pandas & Data Analysis
        "numpy": ["python"],
        "pandas": ["numpy"],
        "eda": ["pandas"],
        "data visualization": ["pandas"],
        "regression": ["eda", "statistics"],
        "classification": ["regression"],
        
        # Web Development
        "html": [],
        "css": ["html"],
        "javascript": ["css", "html"],
        "react": ["javascript"],
        "backend": ["databases"],
        "databases": [],
        "sql": ["databases"],
        "nosql": ["databases"],
        
        # General
        "introduction": [],
        "fundamentals": [],
        "advanced": ["fundamentals"],
        "practice": ["fundamentals"],
    }
    
    for topic in topics:
        topic_lower = topic.lower()
        
        # Check if we have known prerequisites
        found = False
        for known_topic, known_prereqs in known_prerequisites.items():
            if known_topic in topic_lower or topic_lower in known_topic:
                prerequisites[topic] = known_prereqs
                found = True
                break
        
        if not found:
            # Try to infer from topic content
            prerequisites[topic] = _infer_prerequisites(topic, topics)
    
    return prerequisites


def _infer_prerequisites(topic: str, all_topics: List[str]) -> List[str]:
    """
    Infer prerequisites from topic relationships
    
    Args:
        topic: Topic to find prerequisites for
        all_topics: All available topics
        
    Returns:
        Inferred prerequisite topics
    """
    inferred = []
    topic_lower = topic.lower()
    
    # Topics containing "advanced", "intermediate" might depend on basics
    if any(word in topic_lower for word in ["advanced", "intermediate", "expert"]):
        basic_versions = [t for t in all_topics if "basic" in t.lower() or "introduction" in t.lower()]
        inferred.extend(basic_versions)
    
    # If topic has multiple words, single word topics might be prerequisites
    words = topic_lower.split()
    if len(words) > 1:
        for word in words:
            matching = [t for t in all_topics if t.lower() == word]
            if matching:
                inferred.extend(matching)
    
    return list(set(inferred))


def _find_matching_topic(query: str, topics: List[str]) -> str:
    """Find closest matching topic from list"""
    query_lower = query.lower()
    
    # Exact match
    for topic in topics:
        if topic.lower() == query_lower:
            return topic
    
    # Substring match
    for topic in topics:
        if query_lower in topic.lower():
            return topic
    
    # Partial word match
    query_words = query_lower.split()
    for topic in topics:
        topic_words = topic.lower().split()
        if any(q_word in topic_words for q_word in query_words):
            return topic
    
    return None


def _calculate_levels(graph: Dict[str, Dict]) -> None:
    """
    Calculate depth levels for each topic in the dependency graph
    
    Args:
        graph: Knowledge graph to calculate levels for
    """
    # Find all root nodes (topics with no prerequisites)
    roots = [topic for topic, data in graph.items() if not data["prerequisites"]]
    
    # BFS to assign levels
    queue = [(topic, 0) for topic in roots]
    visited = set()
    
    while queue:
        topic, level = queue.pop(0)
        
        if topic in visited:
            continue
        
        visited.add(topic)
        graph[topic]["level"] = level
        
        # Add dependents to queue
        for dependent in graph[topic]["dependents"]:
            if dependent not in visited:
                queue.append((dependent, level + 1))


def topological_sort(graph: Dict[str, Dict], topics: List[str]) -> List[str]:
    """
    Topological sort of topics based on dependencies
    Ensures prerequisites come before dependents
    
    Args:
        graph: Knowledge graph
        topics: List of topics
        
    Returns:
        Sorted list of topics (prerequisites first)
    """
    # Kahn's algorithm for topological sort
    
    # Count incoming edges for each node
    in_degree = {topic: len(graph[topic]["prerequisites"]) for topic in topics}
    
    # Start with nodes that have no prerequisites
    queue = [topic for topic in topics if in_degree[topic] == 0]
    sorted_topics = []
    
    while queue:
        # Sort queue by level for consistent ordering
        queue.sort(key=lambda x: graph[x]["level"])
        node = queue.pop(0)
        sorted_topics.append(node)
        
        # Reduce in-degree for dependents
        for dependent in graph[node]["dependents"]:
            in_degree[dependent] -= 1
            if in_degree[dependent] == 0:
                queue.append(dependent)
    
    # If we couldn't arrange all topics (cycle detection), return original order
    if len(sorted_topics) != len(topics):
        return topics
    
    return sorted_topics


def get_prerequisites_for_topic(topic: str, graph: Dict[str, Dict]) -> List[str]:
    """Get all prerequisites for a topic"""
    if topic not in graph:
        return []
    return graph[topic]["prerequisites"]


def get_dependent_topics(topic: str, graph: Dict[str, Dict]) -> List[str]:
    """Get all topics that depend on the given topic"""
    if topic not in graph:
        return []
    return graph[topic]["dependents"]


def get_topic_level(topic: str, graph: Dict[str, Dict]) -> int:
    """Get the depth level of a topic in the dependency graph"""
    if topic not in graph:
        return 0
    return graph[topic]["level"]
