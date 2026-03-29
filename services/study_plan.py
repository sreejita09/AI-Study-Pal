from .file_parser import extract_topics, estimate_difficulty
import pandas as pd

def generate_study_plan(subject: str, hours: int, text: str = None) -> str:
    if not text:
        text = subject or 'General Study'
    topics = extract_topics(text)
    if not topics:
        topics = [f'Topic {i+1}' for i in range(min(5, max(1, hours // 2)))]
    
    plan_days = []
    total_days = max(1, hours // 2)
    topic_idx = 0
    for day in range(1, total_days + 1):
        if topic_idx < len(topics):
            topic = topics[topic_idx]
            difficulty = estimate_difficulty(topic)
            if difficulty == 'hard':
                activity = f'Deep dive into "{topic}" with examples and practice.'
            elif difficulty == 'medium':
                activity = f'Review "{topic}" and solve related problems.'
            else:
                activity = f'Quick overview of "{topic}" and basic exercises.'
            plan_days.append(f'Day {day}: {activity}')
            if difficulty == 'hard':
                topic_idx += 1  # Spend extra time on hard topics
            else:
                topic_idx += 1
        else:
            plan_days.append(f'Day {day}: Revision and self-assessment.')
    
    plan_text = f'Personalized Study Plan for {subject or "Uploaded Content"} ({hours} hours):\n' + '\n'.join(plan_days)
    return plan_text

def create_plan_csv(plan_text: str) -> str:
    lines = plan_text.split('\n')
    data = []
    for line in lines[1:]:  # Skip header
        if ': ' in line:
            day, activity = line.split(': ', 1)
            data.append({'Day': day, 'Activity': activity})
    df = pd.DataFrame(data)
    csv_path = 'data/plan.csv'
    df.to_csv(csv_path, index=False)
    return csv_path