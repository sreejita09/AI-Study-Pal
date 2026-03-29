"""
Action Generator Module (CRITICAL)
Converts topics into specific, actionable tasks rather than generic descriptions
"""
from typing import List, Dict, Optional


def generate_actionable_tasks(
    topic: str,
    subject: str,
    subject_type: str,
    strategy: str,
    difficulty: str,
    text_content: str = ""
) -> List[str]:
    """
    Generate specific actionable tasks for a topic
    
    IMPORTANT: Returns concrete tasks, NOT generic descriptions
    
    Args:
        topic: Topic name
        subject: Subject name
        subject_type: Type of subject (problem_solving, conceptual, theory, practical)
        strategy: Learning strategy
        difficulty: Difficulty level
        text_content: Source text content
        
    Returns:
        List of specific, actionable tasks
    """
    tasks = []
    
    # Generate tasks based on strategy
    if strategy == 'active-recall':
        tasks = _generate_active_recall_tasks(topic, subject, difficulty)
    elif strategy == 'practice-heavy':
        tasks = _generate_practice_tasks(topic, subject, difficulty)
    elif strategy == 'learn-by-doing':
        tasks = _generate_practical_tasks(topic, subject, difficulty)
    elif strategy == 'spaced-repetition':
        tasks = _generate_spaced_repetition_tasks(topic, subject, difficulty)
    elif strategy == 'guided-discovery':
        tasks = _generate_guided_discovery_tasks(topic, subject, difficulty)
    else:  # mixed
        tasks = _generate_mixed_strategy_tasks(topic, subject, subject_type, difficulty)
    
    # Enhance with domain-specific tasks
    domain_tasks = _generate_domain_specific_tasks(topic, subject)
    tasks.extend(domain_tasks)
    
    # Filter duplicates while preserving order
    seen = set()
    unique_tasks = []
    for task in tasks:
        task_lower = task.lower()
        if task_lower not in seen and len(task) > 10:
            seen.add(task_lower)
            unique_tasks.append(task)
    
    return unique_tasks[:10]  # Return top 10 tasks


def _generate_active_recall_tasks(topic: str, subject: str, difficulty: str) -> List[str]:
    """Generate tasks for active recall strategy"""
    tasks = [
        f"Create 10-15 flashcards about {topic} (front: question, back: answer)",
        f"Close your notes and write down everything you remember about {topic}",
        f"Explain {topic} in your own words as if teaching a beginner",
        f"Answer these questions from memory: What is {topic}? Why is it important? How does it work?",
        f"Quiz yourself without looking at notes: What are the key points of {topic}?",
        f"Make a mind map of {topic} from memory, then check against source",
    ]
    
    if difficulty == 'hard':
        tasks.extend([
            f"Explain {topic} using different analogies and metaphors",
            f"Connect {topic} to other concepts in {subject}",
            f"Discuss edge cases and exceptions in {topic}",
        ])
    
    return tasks


def _generate_practice_tasks(topic: str, subject: str, difficulty: str) -> List[str]:
    """Generate tasks for practice-heavy strategy"""
    
    if 'programming' in subject.lower() or 'python' in subject.lower() or 'coding' in subject.lower():
        tasks = [
            f"Solve 5-10 LeetCode/Codewars problems related to {topic}",
            f"Implement {topic} from scratch without looking at examples",
            f"Debug 3 broken code samples that use {topic}",
            f"Refactor existing code to apply {topic} principles",
            f"Write unit tests for code implementing {topic}",
            f"Solve variations: Easy → Medium → Hard difficulty problems about {topic}",
        ]
    elif 'math' in subject.lower() or 'calculus' in subject.lower() or 'algebra' in subject.lower():
        tasks = [
            f"Solve 15-20 practice problems on {topic}",
            f"Work through 5 worked examples on {topic}, then try similar ones",
            f"Create a formula sheet for {topic}",
            f"Solve problems increasing in difficulty for {topic}",
            f"Identify and fix common mistakes in {topic} solutions",
        ]
    else:
        tasks = [
            f"Complete 10+ practice exercises on {topic}",
            f"Work through all examples related to {topic}",
            f"Test your understanding with practice questions",
            f"Solve problems of varying difficulty about {topic}",
            f"Review solutions and understand different approaches to {topic}",
        ]
    
    if difficulty == 'hard':
        tasks.extend([
            f"Create your own {topic} problems and solve them",
            f"Combine multiple concepts with {topic} in complex scenarios",
        ])
    
    return tasks


def _generate_practical_tasks(topic: str, subject: str, difficulty: str) -> List[str]:
    """Generate tasks for learn-by-doing strategy"""
    
    if 'web' in subject.lower() or 'frontend' in subject.lower() or 'html' in subject.lower():
        tasks = [
            f"Build a small project demonstrating {topic}",
            f"Create a working example with HTML/CSS/JavaScript for {topic}",
            f"Modify an existing component to use {topic}",
            f"Deploy your {topic} project and test all features",
            f"Add interactivity to your {topic} project",
        ]
    elif 'data' in subject.lower() or 'pandas' in subject.lower() or 'python' in subject.lower():
        tasks = [
            f"Load a dataset and apply {topic} step-by-step",
            f"Write code to practice {topic} with real data",
            f"Create visualizations to understand {topic} better",
            f"Experiment with different parameters for {topic}",
            f"Document your {topic} implementation with comments",
        ]
    elif 'machine' in subject.lower() or 'ml' in subject.lower():
        tasks = [
            f"Build a simple model using {topic}",
            f"Train and evaluate a {topic} implementation",
            f"Tune hyperparameters for your {topic} model",
            f"Compare results of different approaches to {topic}",
            f"Document your model's {topic} performance",
        ]
    else:
        tasks = [
            f"Build a project that applies {topic}",
            f"Create a working implementation of {topic}",
            f"Experiment with {topic} in a real-world scenario",
            f"Iterate and improve your {topic} project",
            f"Document your ${topic} implementation process",
        ]
    
    return tasks


def _generate_spaced_repetition_tasks(topic: str, subject: str, difficulty: str) -> List[str]:
    """Generate tasks for spaced repetition strategy"""
    tasks = [
        f"Day 1 - Initial learning: Study {topic} for the first time with full focus",
        f"Day 3 - First review: Go over {topic} and refresh your memory",
        f"Day 7 - Second review: Review {topic} and test recall without notes",
        f"Day 14 - Third review: Deep dive into any weak areas of {topic}",
        f"Day 30 - Final consolidation: Master the nuances of {topic}",
        f"Create recall cues or mnemonics to remember {topic} better",
    ]
    
    if difficulty == 'hard':
        tasks.append(f"Extended review: Combine {topic} with related concepts for better long-term retention")
    
    return tasks


def _generate_guided_discovery_tasks(topic: str, subject: str, difficulty: str) -> List[str]:
    """Generate tasks for guided discovery strategy"""
    tasks = [
        f"Study worked examples of {topic} step-by-step",
        f"Follow a detailed tutorial on {topic}",
        f"Reproduce the examples for {topic} on your own",
        f"Solve guided practice problems about {topic}",
        f"Solve similar problems to the examples without guidance",
        f"Create your own variations of {topic} examples",
    ]
    
    if difficulty == 'hard':
        tasks.extend([
            f"Combine multiple {topic} examples into complex scenarios",
            f"Solve advanced {topic} problems independently",
        ])
    
    return tasks


def _generate_mixed_strategy_tasks(topic: str, subject: str, subject_type: str, difficulty: str) -> List[str]:
    """Generate tasks combining multiple strategies"""
    tasks = [
        f"Understand the core concepts of {topic}: Read, annotate, and summarize",
        f"Practice {topic}: Solve 5-10 problems or exercises",
        f"Review and recall: Test yourself on {topic} without looking at notes",
        f"Apply {topic}: Use it in a mini-project or real scenario",
        f"Consolidate: Create a summary document or presentation on {topic}",
    ]
    
    if subject_type == 'problem_solving':
        tasks.insert(1, f"Study example solutions related to {topic}")
    elif subject_type == 'theory':
        tasks.insert(0, f"Deep conceptual study of {topic} fundamentals")
    elif subject_type == 'practical':
        tasks.insert(3, f"Implement a working example of {topic}")
    
    return tasks


def _generate_domain_specific_tasks(topic: str, subject: str) -> List[str]:
    """Generate tasks specific to the subject domain"""
    tasks = []
    subject_lower = subject.lower()
    topic_lower = topic.lower()
    
    # Data Science specific
    if 'data' in subject_lower or 'machine' in subject_lower or 'ml' in subject_lower:
        if any(kw in topic_lower for kw in ['eda', 'visualization', 'analysis']):
            tasks.extend([
                f"Load a dataset and perform {topic}",
                f"Create multiple {topic} visualizations with different approaches",
                f"Write Python code to automate {topic} on any dataset",
            ])
        if 'regression' in topic_lower:
            tasks.extend([
                f"Implement both simple and multiple {topic} from scratch",
                f"Compare sklearn's {topic} with your implementation",
                f"Validate your {topic} model using cross-validation",
            ])
        if 'classification' in topic_lower or 'predict' in topic_lower:
            tasks.extend([
                f"Build two different {topic} models",
                f"Evaluate both models using precision, recall, F1-score for {topic}",
                f"Optimize {topic} model hyperparameters",
            ])
    
    # Programming specific
    if any(word in subject_lower for word in ['python', 'javascript', 'algorithm', 'coding']):
        if 'loop' in topic_lower:
            tasks.extend([
                f"Write for, while, and nested {topic}s",
                f"Solve 3 problems using {topic}: sum, finding max, filtering",
            ])
        if 'function' in topic_lower:
            tasks.extend([
                f"Define functions with different signatures for {topic}",
                f"Practice lambda functions and callbacks",
            ])
        if 'oop' in topic_lower or 'class' in topic_lower:
            tasks.extend([
                f"Design and implement a class system for {topic}",
                f"Practice inheritance and polymorphism with {topic}",
            ])
    
    # Math/Statistics specific
    if any(word in subject_lower for word in ['math', 'calculus', 'algebra', 'statistics']):
        if 'probability' in topic_lower:
            tasks.extend([
                f"Solve 10 {topic} problems with different distributions",
                f"Use Python to simulate {topic} experiments",
            ])
        if any(kw in topic_lower for kw in ['derivative', 'integral', 'limit']):
            tasks.extend([
                f"Calculate {topic} by hand for 5 different functions",
                f"Verify results using calculus software or Python",
            ])
    
    return tasks


def generate_day_tasks(
    day_topics: List[str],
    subject: str,
    strategies: Dict[str, str],
    difficulties: Dict[str, str]
) -> Dict[str, List[str]]:
    """
    Generate all tasks for a study day
    
    Args:
        day_topics: Topics to study on this day
        subject: Subject name
        strategies: Dict mapping topic -> strategy
        difficulties: Dict mapping topic -> difficulty
        
    Returns:
        Dict mapping topic -> list of tasks
    """
    day_tasks = {}
    
    for topic in day_topics:
        strategy = strategies.get(topic, 'mixed')
        difficulty = difficulties.get(topic, 'medium')
        
        tasks = generate_actionable_tasks(
            topic=topic,
            subject=subject,
            subject_type='mixed',
            strategy=strategy,
            difficulty=difficulty
        )
        
        day_tasks[topic] = tasks
    
    return day_tasks


def generate_task_checklist(tasks: List[str]) -> List[Dict]:
    """
    Convert tasks to a checklist format with priority
    
    Args:
        tasks: List of tasks
        
    Returns:
        List of checklist items with metadata
    """
    checklist = []
    
    for i, task in enumerate(tasks):
        # Estimate time based on task type
        time_estimate = 15  # default 15 minutes
        
        if 'solve' in task.lower() or 'practice' in task.lower():
            time_estimate = 30
        elif 'read' in task.lower() or 'study' in task.lower():
            time_estimate = 20
        elif 'implement' in task.lower() or 'build' in task.lower() or 'code' in task.lower():
            time_estimate = 45
        elif 'review' in task.lower() or 'quiz' in task.lower():
            time_estimate = 15
        
        priority = 'high' if i < len(tasks) // 2 else 'medium'
        
        checklist.append({
            'task': task,
            'completed': False,
            'priority': priority,
            'estimated_minutes': time_estimate,
            'notes': ''
        })
    
    return checklist
