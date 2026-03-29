import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  CheckSquare,
  ChevronRight,
  Download,
  FileText,
  FolderUp,
  Sparkles,
  Users
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import StudyDayCard from "../components/dashboard/StudyDayCard";
import Sidebar from "../components/layout/Sidebar";
import Topbar from "../components/layout/Topbar";
import AIFileStudio from '../components/AIFileStudio';

function formatFileSize(size) {
  if (!size) return "0 KB";
  const mb = size / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(size / 1024).toFixed(0)} KB`;
}

function AnalyticsBars({ values = [] }) {
  const max = Math.max(...values, 1);

  return (
    <div className="mt-4 flex items-end gap-3">
      {values.map((value, index) => (
        <div key={`${value}-${index}`} className="flex flex-1 flex-col items-center gap-2">
          <div
            className="w-full rounded-t-2xl bg-highlight/90"
            style={{ height: `${(value / max) * 120}px` }}
          />
          <span className="text-xs text-zinc-500">D{index + 1}</span>
        </div>
      ))}
    </div>
  );
}

function splitDirtyTopic(topic) {
  return String(topic || "")
    .split(/\n|,|;|\u2022|\|/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function normalizeStudyPlan(rawPlan) {
  if (!rawPlan) return [];

  const source = Array.isArray(rawPlan)
    ? rawPlan
    : Array.isArray(rawPlan?.plan)
      ? rawPlan.plan
      : [];

  return source
    .map((entry, index) => {
      const cleanedTopics = (entry?.topics || []).flatMap(splitDirtyTopic);
      const uniqueTopics = [...new Set(cleanedTopics)];

      return {
        day: entry?.day ?? index + 1,
        date: entry?.date ?? "",
        topics: uniqueTopics
      };
    })
    .filter((entry) => entry.topics.length > 0);
}

function buildFallbackStudyPlan(recommendedTopics = []) {
  return recommendedTopics.slice(0, 6).map((topic, index) => ({
    day: index + 1,
    date: new Date(Date.now() + index * 86400000).toISOString(),
    topics: splitDirtyTopic(topic)
  }));
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [darkMode, setDarkMode] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [uploads, setUploads] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState("");
  const [aiOutput, setAiOutput] = useState(null);
  const [completedTopicsByDay, setCompletedTopicsByDay] = useState({});

  useEffect(() => {
    document.body.style.background = darkMode
      ? "radial-gradient(circle at top left, rgba(250, 204, 21, 0.08), transparent 20%), linear-gradient(180deg, #0a0a0a 0%, #060606 100%)"
      : "linear-gradient(180deg, #141414 0%, #090909 100%)";
  }, [darkMode]);

  useEffect(() => {
    const load = async () => {
      try {
        const [{ data: dashboardData }, { data: uploadData }] = await Promise.all([
          api.get("/dashboard"),
          api.get("/uploads")
        ]);
        setDashboard(dashboardData);
        setUploads(uploadData.uploads);
      } catch (error) {
        if (error.response?.status === 401) {
          await logout();
          navigate("/login", { replace: true });
          return;
        }
        toast.error("Could not load dashboard data");
      }
    };

    load();
  }, [logout, navigate]);

  const progressCards = useMemo(
    () => [
      { title: "Exercise 1", state: "Completed" },
      { title: "Exercise 2", state: "Completed" },
      { title: "Exercise 3", state: "In progress", active: true },
      { title: "Project 360", state: "Upcoming" }
    ],
    []
  );

  const studyPlanDays = useMemo(() => {
    if (!dashboard) return [];

    const normalized = normalizeStudyPlan(
      dashboard.studyPlan ?? dashboard.generatedPlan ?? dashboard.latestPlan
    );

    if (normalized.length) return normalized;

    return buildFallbackStudyPlan(
      dashboard.recommendations?.recommendedTopics || []
    );
  }, [dashboard]);

  const overallPlanProgress = useMemo(() => {
    const totalTopics = studyPlanDays.reduce(
      (sum, day) => sum + day.topics.length,
      0
    );
    const completed = Object.values(completedTopicsByDay).reduce(
      (sum, topics) => sum + topics.length,
      0
    );

    return totalTopics ? Math.round((completed / totalTopics) * 100) : 0;
  }, [completedTopicsByDay, studyPlanDays]);

  const onLogout = async () => {
    try {
      await logout();
      toast.success("Logged out");
      navigate("/login", { replace: true });
    } catch (error) {
      toast.error("Could not log out");
    }
  };

  const onUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    setUploading(true);

    try {
      const { data } = await api.post("/uploads", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setUploads((current) => [data.upload, ...current]);
      toast.success("File uploaded");
    } catch (error) {
      toast.error(error.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleTaskToggle = async (taskId) => {
    try {
      const { data } = await api.patch(`/dashboard/tasks/${taskId}/toggle`);
      setDashboard((current) => ({ ...current, taskChecklist: data.taskChecklist }));
    } catch (error) {
      toast.error("Could not update task");
    }
  };

  const handleStudyTopicToggle = (dayNumber, topic) => {
    setCompletedTopicsByDay((current) => {
      const existing = current[dayNumber] || [];
      const nextTopics = existing.includes(topic)
        ? existing.filter((item) => item !== topic)
        : [...existing, topic];

      return {
        ...current,
        [dayNumber]: nextTopics
      };
    });
  };

  const runAiAction = async (type) => {
    if (!aiInput.trim()) {
      toast.error("Add some learning content first");
      return;
    }

    setAiLoading(type);

    try {
      const endpoint =
        type === "summary"
          ? "/dashboard/ai/summarize"
          : type === "quiz"
            ? "/dashboard/ai/quiz"
            : "/dashboard/ai/notes";

      const payload =
        type === "quiz"
          ? { topic: aiInput }
          : type === "notes"
            ? { topic: aiInput }
            : { content: aiInput };

      const { data } = await api.post(endpoint, payload);
      setAiOutput({ type, data });
    } catch (error) {
      toast.error("AI action failed");
    } finally {
      setAiLoading("");
    }
  };

  if (!dashboard) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink text-zinc-400">
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="p-8 text-white">
      <AIFileStudio />
    </div>
  );
}
