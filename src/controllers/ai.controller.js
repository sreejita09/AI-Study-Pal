const asyncHandler = require("../utils/asyncHandler");
const LearningProfile = require("../models/LearningProfile");
const { summarizeContent, generateQuiz, generateNotes } = require("../services/ai");
const { buildLearningRecommendations, syncLearningProfile } = require("../services/learningEngine");

const getDashboard = asyncHandler(async (req, res) => {
  const profile = await LearningProfile.findOne({ user: req.user._id });
  const recommendations = buildLearningRecommendations(req.user, profile);

  res.json({
    overview: {
      progress: 63,
      completedExercises: 12,
      activeModules: profile?.history.activeModules || 4,
      hoursSpent: profile?.history.hoursSpent || 42
    },
    weakTopics: req.user.learningStats.weakTopics,
    recommendations,
    upcomingEvents: [
      {
        title: "Visual Design",
        mentor: "Malfada Pereira",
        time: "23 Feb, 19:00 - 23:00",
        accent: "violet"
      },
      {
        title: "Interaction Design",
        mentor: "Andre Martins",
        time: "27 Feb, 19:00 - 23:00",
        accent: "amber"
      },
      {
        title: "Pre Presentation Ex 3",
        mentor: "Malfada Pereira | Andre Martins",
        time: "29 Feb, 19:00 - 23:00",
        accent: "yellow"
      }
    ],
    lessons: [
      {
        id: "lesson-1",
        title: "The Importance of Color",
        tag: "Visual Design",
        date: "22 Feb 2024",
        author: "Mafalda Pereira",
        image:
          "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=80"
      },
      {
        id: "lesson-2",
        title: "The Importance of Typography",
        tag: "Visual Design",
        date: "20 Feb 2024",
        author: "Mafalda Pereira",
        image:
          "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80"
      },
      {
        id: "lesson-3",
        title: "Card Sorting",
        tag: "UX Research",
        date: "16 Feb 2024",
        author: "Francisco Mouga",
        image:
          "https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=800&q=80"
      }
    ],
    teamMembers: [
      { name: "Ines Mota", role: "Commercial" },
      { name: "Ana Abreu", role: "Designer" },
      { name: "Joana Falero", role: "Research" }
    ],
    taskChecklist: profile?.taskChecklist || [],
    analytics: {
      weeklyFocusHours: [6, 8, 7, 9, 10, 8, 11],
      retentionScore: 84,
      weakTopicCount: req.user.learningStats.weakTopics.length
    }
  });
});

const summarize = asyncHandler(async (req, res) => {
  const profile = await syncLearningProfile(req.user);
  const summary = summarizeContent({
    content: req.body.content || "",
    weakTopics: profile.weakTopics
  });

  res.json(summary);
});

const quiz = asyncHandler(async (req, res) => {
  const profile = await LearningProfile.findOne({ user: req.user._id });
  const recommendations = buildLearningRecommendations(req.user, profile);

  res.json(
    generateQuiz({
      topic: req.body.topic || recommendations.recommendedTopics[0],
      difficulty: recommendations.nextDifficulty
    })
  );
});

const notes = asyncHandler(async (req, res) => {
  const profile = await LearningProfile.findOne({ user: req.user._id });
  const recommendations = buildLearningRecommendations(req.user, profile);

  res.json(
    generateNotes({
      topic: req.body.topic || "Interaction Design",
      recommendations: recommendations.recommendedTopics
    })
  );
});

const toggleTask = asyncHandler(async (req, res) => {
  const profile = await LearningProfile.findOne({ user: req.user._id });

  if (!profile) {
    return res.status(404).json({ message: "Learning profile not found" });
  }

  const task = profile.taskChecklist.find((item) => item.id === req.params.taskId);

  if (!task) {
    return res.status(404).json({ message: "Task not found" });
  }

  task.complete = !task.complete;
  await profile.save();

  res.json({ taskChecklist: profile.taskChecklist });
});

module.exports = {
  getDashboard,
  summarize,
  quiz,
  notes,
  toggleTask
};
