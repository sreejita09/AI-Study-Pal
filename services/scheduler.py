"""
Scheduler Module
Allocates time per topic and creates study schedule with spaced repetition
"""
from typing import Dict, List, Tuple
from .difficulty_estimator import get_difficulty_score, difficulty_to_learning_time_multiplier


def allocate_time_per_topic(
    topics: List[str],
    total_hours: int,
    topic_difficulties: Dict[str, str],
    weak_topics: List[str] = None
) -> Dict[str, int]:
    """
    Allocate study time for each topic based on difficulty and weakness
    
    Args:
        topics: Ordered list of topics
        total_hours: Total hours available
        topic_difficulties: Dict mapping topic -> difficulty level
        weak_topics: Topics user struggles with (bonus time)
        
    Returns:
        Dictionary mapping topic -> minutes to study
    """
    weak_topics = weak_topics or []
    total_minutes = total_hours * 60
    
    # Calculate difficulty scores
    difficulty_scores = {}
    total_score = 0
    
    for topic in topics:
        difficulty = topic_difficulties.get(topic, 'medium')
        multiplier = difficulty_to_learning_time_multiplier(difficulty)
        
        # Boost for weak topics
        if any(weak_topic.lower() in topic.lower() for weak_topic in weak_topics):
            multiplier *= 1.5  # 50% more time for weak topics
        
        difficulty_scores[topic] = multiplier
        total_score += multiplier
    
    # Allocate time proportional to scores
    time_allocation = {}
    for topic in topics:
        proportion = difficulty_scores[topic] / total_score if total_score > 0 else 1 / len(topics)
        minutes = int(total_minutes * proportion)
        time_allocation[topic] = max(minutes, 30)  # Minimum 30 minutes per topic
    
    return time_allocation


def schedule_topics(
    topics: List[str],
    time_allocation: Dict[str, int],
    days_available: int,
    topic_details: Dict[str, Dict]
) -> List[Dict]:
    """
    Create a daily study schedule with spaced repetition
    
    Args:
        topics: Ordered list of topics
        time_allocation: Time per topic in minutes
        days_available: Number of days available
        topic_details: Details about each topic
        
    Returns:
        List of daily schedules
    """
    schedule = []
    
    # Create base schedule (first pass through topics)
    daily_schedule = _create_base_schedule(topics, time_allocation, days_available, topic_details)
    
    # Add spaced repetition
    daily_schedule = _add_spaced_repetition(daily_schedule, topics, days_available)
    
    return daily_schedule


def _create_base_schedule(
    topics: List[str],
    time_allocation: Dict[str, int],
    days_available: int,
    topic_details: Dict[str, Dict]
) -> List[Dict]:
    """Create base schedule covering all topics once"""
    
    schedule = []
    topic_idx = 0
    
    for day in range(1, days_available + 1):
        day_topics = []
        day_time = 0
        daily_limit = 5 * 60  # 5 hours per day
        
        while topic_idx < len(topics) and day_time < daily_limit:
            topic = topics[topic_idx]
            topic_time = time_allocation.get(topic, 60)
            
            if day_time + topic_time <= daily_limit:
                day_topics.append(topic)
                day_time += topic_time
                topic_idx += 1
            else:
                break
        
        if day_topics:
            schedule.append({
                'day': day,
                'topics': day_topics,
                'time_minutes': day_time,
                'repetition_type': 'first_pass'
            })
    
    return schedule


def _add_spaced_repetition(
    base_schedule: List[Dict],
    topics: List[str],
    days_available: int
) -> List[Dict]:
    """Add spaced repetition reviews to the schedule"""
    
    total_schedule = base_schedule[::]
    spaced_intervals = [2, 5, 10]  # Review after 2, 5, 10 days
    
    for schedule_item in base_schedule[:]:
        day = schedule_item['day']
        topics_in_day = schedule_item['topics']
        
        # Plan reviews for these topics
        for interval in spaced_intervals:
            review_day = day + interval
            if review_day <= days_available:
                # Find or create schedule for review day
                review_schedule = next(
                    (item for item in total_schedule if item['day'] == review_day),
                    None
                )
                
                if not review_schedule:
                    review_schedule = {
                        'day': review_day,
                        'topics': [],
                        'time_minutes': 0,
                        'repetition_type': 'spaced_repetition'
                    }
                    total_schedule.append(review_schedule)
                else:
                    if review_schedule['repetition_type'] != 'mixed':
                        review_schedule['repetition_type'] = 'mixed'
                
                # Add topics to review
                time_per_topic = 20  # 20 minutes per review
                for topic in topics_in_day:
                    if topic not in review_schedule['topics']:
                        review_schedule['topics'].append(topic)
                        review_schedule['time_minutes'] += time_per_topic
    
    # Sort by day and enforce daily time limits
    total_schedule.sort(key=lambda x: x['day'])
    
    # Enforce 5-hour daily limit
    for schedule_item in total_schedule:
        if schedule_item['time_minutes'] > 5 * 60:
            # Distribute overflow to other days
            schedule_item['time_minutes'] = min(schedule_item['time_minutes'], 5 * 60)
    
    return total_schedule


def create_interleaved_schedule(
    topics: List[str],
    time_allocation: Dict[str, int],
    days_available: int
) -> List[Dict]:
    """
    Create an interleaved study schedule (mix topics daily)
    Good for learning connections between topics
    
    Args:
        topics: List of topics
        time_allocation: Time per topic
        days_available: Days available
        
    Returns:
        Interleaved daily schedule
    """
    
    schedule = []
    total_minutes_per_day = 5 * 60  # 5 hours
    
    for day in range(1, days_available + 1):
        day_topics = []
        day_time = 0
        
        # Rotate through topics
        for i, topic in enumerate(topics):
            if day_time < total_minutes_per_day:
                topic_time = int(time_allocation.get(topic, 60) / days_available)
                if day_time + topic_time <= total_minutes_per_day:
                    day_topics.append(topic)
                    day_time += topic_time
        
        if day_topics:
            schedule.append({
                'day': day,
                'topics': day_topics,
                'time_minutes': day_time,
                'repetition_type': 'interleaved'
            })
    
    return schedule


def calculate_study_pace(total_minutes: int, days_available: int) -> Dict:
    """Calculate recommended study pace"""
    total_hours = total_minutes / 60
    avg_hours_per_day = total_hours / days_available
    
    return {
        'total_hours': round(total_hours, 1),
        'total_days': days_available,
        'hours_per_day': round(avg_hours_per_day, 1),
        'minutes_per_day': int(total_minutes / days_available),
        'intensity': 'light' if avg_hours_per_day < 2 else 'moderate' if avg_hours_per_day < 4 else 'heavy'
    }


def recommend_study_schedule_type(subject_type: str, days_available: int) -> str:
    """Recommend schedule type based on subject and time"""
    
    if subject_type == 'problem_solving':
        return 'linear' if days_available < 7 else 'spaced_repetition'
    elif subject_type == 'theory':
        return 'spaced_repetition'
    elif subject_type == 'practical':
        return 'interleaved' if days_available > 7 else 'linear'
    else:
        return 'mixed'


def get_today_focus(current_day: int, schedule: List[Dict]) -> Dict:
    """Get what to focus on today"""
    day_schedule = next((item for item in schedule if item['day'] == current_day), None)
    
    if not day_schedule:
        return {
            'day': current_day,
            'topics': [],
            'message': 'Rest day or schedule complete'
        }
    
    return {
        'day': current_day,
        'topics': day_schedule['topics'],
        'time_minutes': day_schedule['time_minutes'],
        'repetition_type': day_schedule['repetition_type'],
        'message': f'Study {len(day_schedule["topics"])} topics today for {day_schedule["time_minutes"]} minutes'
    }
