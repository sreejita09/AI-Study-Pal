"""
Learning Optimization Engine - Main Orchestrator
Transforms uploaded study material into an optimized, personalized study plan
"""
from typing import Dict, List, Optional, Any
from .topic_extractor import extract_and_clean_topics
from .knowledge_graph import build_knowledge_graph, topological_sort
from .subject_classifier import classify_subject_type
from .difficulty_estimator import estimate_topic_difficulty, estimate_overall_difficulty
from .strategy_engine import map_learning_strategy, get_learning_strategies
from .scheduler import schedule_topics, allocate_time_per_topic
from .action_generator import generate_actionable_tasks
import json
from datetime import datetime, timedelta


class LearningOptimizationEngine:
    """
    Main engine for generating optimized study plans
    """
    
    def __init__(self):
        self.subject = ""
        self.text = ""
        self.user_profile = {}
        self.topics = []
        self.knowledge_graph = {}
        self.subject_type = ""
        self.topic_details = {}
        self.strategies = {}
        
    def generate_study_plan(
        self,
        text: str,
        subject: str,
        user_profile: Optional[Dict[str, Any]] = None,
        days_available: int = 7
    ) -> Dict[str, Any]:
        """
        Main pipeline to generate an optimized study plan
        
        Args:
            text: Extracted study material text
            subject: Subject/topic name
            user_profile: Optional user preferences (hours_per_day, weak_topics, learning_style)
            days_available: Number of days available for study
            
        Returns:
            Structured study plan with topics and tasks
        """
        self.text = text
        self.subject = subject
        self.user_profile = user_profile or {}
        
        try:
            # Step 1: Extract and normalize topics
            self.topics = extract_and_clean_topics(text, subject, top_n=10)
            if not self.topics:
                raise ValueError("Could not extract meaningful topics from text")
            
            # Step 2: Classify subject type
            self.subject_type = classify_subject_type(subject, text)
            
            # Step 3: Build knowledge graph (dependency ordering)
            self.knowledge_graph = build_knowledge_graph(self.topics)
            ordered_topics = topological_sort(self.knowledge_graph, self.topics)
            
            # Step 4: Estimate difficulty for each topic
            topic_difficulties = {}
            for topic in ordered_topics:
                difficulty = estimate_topic_difficulty(
                    topic,
                    text,
                    self.subject_type
                )
                topic_difficulties[topic] = difficulty
            
            # Step 5: Map learning strategies
            for topic in ordered_topics:
                strategy = map_learning_strategy(
                    subject_type=self.subject_type,
                    topic=topic,
                    difficulty=topic_difficulties[topic]
                )
                self.strategies[topic] = strategy
                self.topic_details[topic] = {
                    "difficulty": topic_difficulties[topic],
                    "strategy": strategy,
                    "prerequisites": self.knowledge_graph.get(topic, {}).get("prerequisites", [])
                }
            
            # Step 6: Allocate time per topic
            hours_per_day = self.user_profile.get("hours_per_day", 5)
            total_hours = hours_per_day * days_available
            weak_topics = self.user_profile.get("weak_topics", [])
            
            time_allocation = allocate_time_per_topic(
                ordered_topics,
                total_hours,
                topic_difficulties,
                weak_topics
            )
            
            # Step 7: Schedule topics with spaced repetition
            scheduled_plan = schedule_topics(
                ordered_topics,
                time_allocation,
                days_available,
                self.topic_details
            )
            
            # Step 8: Generate actionable tasks
            final_plan = []
            for day_plan in scheduled_plan:
                day_with_tasks = {
                    "day": day_plan["day"],
                    "date": (datetime.now() + timedelta(days=day_plan["day"]-1)).strftime("%Y-%m-%d"),
                    "topics": day_plan["topics"],
                    "total_time_minutes": day_plan["time_minutes"],
                    "tasks": []
                }
                
                for topic in day_plan["topics"]:
                    tasks = generate_actionable_tasks(
                        topic=topic,
                        subject=subject,
                        subject_type=self.subject_type,
                        strategy=self.strategies.get(topic, "mixed"),
                        difficulty=self.topic_details.get(topic, {}).get("difficulty", "medium"),
                        text_content=text
                    )
                    day_with_tasks["tasks"].extend(tasks)
                
                final_plan.append(day_with_tasks)
            
            # Build output
            output = {
                "subject": subject,
                "subject_type": self.subject_type,
                "total_days": days_available,
                "total_hours": total_hours,
                "topics_count": len(ordered_topics),
                "topics": ordered_topics,
                "plan": final_plan,
                "metadata": {
                    "generated_at": datetime.now().isoformat(),
                    "user_profile": self.user_profile,
                    "strategy_summary": self._generate_strategy_summary()
                }
            }
            
            return output
            
        except Exception as e:
            raise Exception(f"Error generating study plan: {str(e)}")
    
    def _generate_strategy_summary(self) -> Dict[str, int]:
        """Generate summary of learning strategies used"""
        summary = {}
        for strategy in self.strategies.values():
            summary[strategy] = summary.get(strategy, 0) + 1
        return summary


def generate_study_plan(
    text: str,
    subject: str,
    user_profile: Optional[Dict[str, Any]] = None,
    days_available: int = 7
) -> Dict[str, Any]:
    """
    Wrapper function for easy integration into Flask routes
    
    Args:
        text: Extracted study material
        subject: Subject name
        user_profile: Optional user preferences
        days_available: Days available for study
        
    Returns:
        Structured study plan
    """
    engine = LearningOptimizationEngine()
    return engine.generate_study_plan(text, subject, user_profile, days_available)
