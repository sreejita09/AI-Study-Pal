import { useEffect, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import showToast from "../lib/showToast";
import api from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../context/ThemeContext";
import DashboardSidebar from "../components/dashboard/DashboardSidebar";
import StudyMode from "../components/dashboard/StudyMode";
import Workspace from "../components/dashboard/Workspace";
import UploadBar from "../components/dashboard/UploadBar";
import StudyPanel from "../components/dashboard/StudyPanel";
import MotivationBanner from "../components/dashboard/MotivationBanner";
import MotivationCard from "../components/dashboard/MotivationCard";
import ProgressWidgets from "../components/dashboard/ProgressWidgets";
import NotificationBell from "../components/common/NotificationBell";
import PomodoroModal from "../components/dashboard/PomodoroModal";
import DashboardHome from "../components/dashboard/DashboardHome";
import QuizScreen from "../components/dashboard/QuizScreen";
import { loadWeakTopics, saveWeakTopics } from "../lib/weakTopics";
import { saveLastMaterial, loadLastMaterial } from "../lib/lastMaterial";
import { MotivationProvider, useMotivation } from "../hooks/useMotivation";

function loadState(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

/* fires once on mount — shows a progress or warning card based on today's status */
function MotivationTrigger() {
  const { showCard } = useMotivation();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get("/progress");
        if (cancelled) return;
        const { today = {}, overall = {} } = data;
        if (today.done > 0 && today.done >= today.total) return; // already celebrated live
        if (overall.completionPercent !== undefined && overall.completionPercent < 50 && overall.total > 0) {
          showCard({ type: "warning", title: "You're slightly behind", message: "Try finishing 1 task now to get back on track" });
        } else if (today.done === 0 && today.total > 0) {
          showCard({ type: "progress", title: "Keep going!", message: `You have ${today.total} task${today.total !== 1 ? "s" : ""} lined up for today` });
        }
      } catch { /* silent */ }
    })();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme } = useTheme();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState("materials");
  const [sessions, setSessions] = useState(() => loadState("sp_sessions", []));
  const [studyPlans, setStudyPlans] = useState(() => loadState("sp_plans", []));
  const [activeSessionId, setActiveSessionId] = useState(() => loadState("sp_active", null));
  const [messages, setMessages] = useState(() => loadState("sp_messages", {}));

  // Material-based planning state
  const [materials, setMaterials] = useState([]);
  const [selectedMaterialIds, setSelectedMaterialIds] = useState([]);
  const [plans, setPlans] = useState([]);
  const [activePlanId, setActivePlanId] = useState(null);

  // StudyPanel (per-material AI content)
  const [studyPanelMaterial, setStudyPanelMaterial] = useState(null);
  const [studyPanelTab, setStudyPanelTab] = useState("summary");

  // Progress refresh trigger
  const [progressRefresh, setProgressRefresh] = useState(0);
  const [lastTaskDone, setLastTaskDone] = useState(false);

  // Pomodoro fullscreen
  const [pomoOpen, setPomoOpen] = useState(false);

  // Full-screen quiz session: null | { questions, materialTitle }
  const [quizSession, setQuizSession] = useState(null);

  // Weak topics: seeded from localStorage, synced with backend
  const [weakTopics, setWeakTopics] = useState(() => loadWeakTopics());

  // Last accessed material for Resume Study card
  const [lastMaterial, setLastMaterial] = useState(() => loadLastMaterial());

  const onStartQuiz = (questions) => {
    const matTitle = studyPanelMaterial?.title || "";
    setStudyPanelMaterial(null); // close StudyPanel
    setQuizSession({ questions, materialTitle: matTitle });
  };

  /** Called by QuizScreen when the user finishes a quiz. */
  const onQuizComplete = async (topics) => {
    if (!Array.isArray(topics) || topics.length === 0) return;
    setWeakTopics(topics);
    saveWeakTopics(topics);
    // Best-effort sync to backend — ignore failures
    try { await api.patch("/progress/weak-topics", { weakTopics: topics }); } catch { /* silent */ }
  };

  /**
   * Generate a quiz around a specific weak topic.
   * Opens QuizScreen with AI-generated questions.
   */
  const onWeakTopicQuiz = async (topic) => {
    if (aiLoading) return;
    setAiLoading("quiz");
    try {
      const { data } = await api.post("/ai/generate", { text: topic, mode: "quiz" });
      const questions = data.result || data.output || [];
      if (Array.isArray(questions) && questions.length > 0) {
        setQuizSession({ questions, materialTitle: `Quiz: ${topic}` });
      } else {
        showToast("Could not generate quiz for this topic", "error");
      }
    } catch {
      showToast("Failed to generate quiz", "error");
    } finally {
      setAiLoading("");
    }
  };

  /** Manually add a topic to the weak topics list. */
  const onAddTopic = async (topic) => {
    const trimmed = topic.trim();
    if (!trimmed) return;
    const updated = Array.from(new Set([trimmed, ...weakTopics])).slice(0, 5);
    setWeakTopics(updated);
    saveWeakTopics(updated);
    try { await api.patch("/progress/weak-topics", { weakTopics: updated }); } catch { /* silent */ }
  };

  // Multi-file state: array of { name, type, text }
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [aiLoading, setAiLoading] = useState("");
  const [activeFeature, setActiveFeature] = useState("summary");
  const [history, setHistory] = useState(() => loadState("sp_history", []));

  // Per-mode cached results: { summary, notes, notesDetailed, quiz }
  const [results, setResults] = useState({});
  // Notes detail toggle: "quick" | "detailed"
  const [noteType, setNoteType] = useState("quick");

  // Derived: combined extracted text from all files
  const combinedText = files.map((f) => f.text).join("\n\n");

  // Persist to localStorage
  useEffect(() => { localStorage.setItem("sp_sessions", JSON.stringify(sessions)); }, [sessions]);
  useEffect(() => { localStorage.setItem("sp_plans", JSON.stringify(studyPlans)); }, [studyPlans]);
  useEffect(() => { localStorage.setItem("sp_active", JSON.stringify(activeSessionId)); }, [activeSessionId]);
  useEffect(() => { localStorage.setItem("sp_messages", JSON.stringify(messages)); }, [messages]);
  useEffect(() => { localStorage.setItem("sp_history", JSON.stringify(history)); }, [history]);

  // Reusable fetchers
  const fetchMaterials = useCallback(async () => {
    try {
      const { data } = await api.get("/materials");
      console.log("Materials:", (data.materials || []).length);
      setMaterials(data.materials || []);
    } catch { /* silent */ }
  }, []);

  const fetchPlans = useCallback(async () => {
    try {
      const { data } = await api.get("/plans");
      setPlans(data.plans || []);
    } catch { /* silent */ }
  }, []);

  // Fetch materials and plans on mount + try to load backend weak topics
  useEffect(() => {
    fetchMaterials();
    fetchPlans();
    (async () => {
      try {
        const { data } = await api.get("/progress/weak-topics");
        if (Array.isArray(data.weakTopics) && data.weakTopics.length > 0) {
          setWeakTopics(data.weakTopics);
          saveWeakTopics(data.weakTopics);
        }
      } catch { /* backend may not have data yet — localStorage fallback already applied */ }
    })();
  }, [fetchMaterials, fetchPlans]);

  const onToggleMaterial = (id) => {
    setSelectedMaterialIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const onSelectAllMaterials = () => {
    setSelectedMaterialIds((prev) =>
      prev.length === materials.length ? [] : materials.map((m) => m._id || m.id)
    );
  };

  const onSelectPlan = (id) => {
    setActivePlanId(id);
    setActiveTab("plans");
  };

  const onMaterialQuickAction = (materialId, tab) => {
    const mat = materials.find((m) => (m._id || m.id) === materialId);
    if (!mat) return;
    setStudyPanelMaterial(mat);
    setStudyPanelTab(tab);
    // Track last accessed material
    const entry = { id: materialId, title: mat.title, subject: mat.subject, lastView: tab };
    saveLastMaterial(entry);
    setLastMaterial({ ...entry, lastAccessed: Date.now() });
  };

  /** Called by StudyPanel when the user switches tabs — updates lastView only. */
  const onStudyPanelTabChange = (tab) => {
    if (!studyPanelMaterial) return;
    const id = studyPanelMaterial._id || studyPanelMaterial.id;
    saveLastMaterial({ id, lastView: tab });
    setLastMaterial((prev) => prev?.id === id ? { ...prev, lastView: tab, lastAccessed: Date.now() } : prev);
  };

  /** Resume the last opened material at its last view. */
  const onResumeStudy = (id, view) => {
    const mat = materials.find((m) => (m._id || m.id) === id);
    if (!mat) return;
    onMaterialQuickAction(id, view || "summary");
  };

  const onDeleteMaterial = async (materialId) => {
    try {
      const { data } = await api.delete(`/materials/${materialId}`);
      console.log("Deleted material:", materialId, data);
      setMaterials((prev) => prev.filter((m) => (m._id || m.id) !== materialId));
      setSelectedMaterialIds((prev) => prev.filter((id) => id !== materialId));

      // Refetch plans since related plans/tasks were cleaned up
      await fetchPlans();

      if (data.affectedPlans > 0) {
        showToast("Material removed — related plan was also deleted", "info");
      } else if (data.deletedTasks > 0) {
        showToast("Material deleted — tasks were removed from your plan", "info");
      } else {
        showToast("Material deleted", "success");
      }
    } catch {
      showToast("Failed to delete material", "error");
    }
  };

  const onReprocessMaterial = async (materialId) => {
    try {
      showToast("Re-extracting topics…", "info");
      const { data } = await api.post(`/materials/${materialId}/reprocess`);
      setMaterials((prev) =>
        prev.map((m) => ((m._id || m.id) === materialId ? { ...m, ...data.material } : m))
      );
      const count = data.material?.extractedTopics?.length || 0;
      showToast(`Extracted ${count} topics — create a new plan to use them`, "success");
    } catch {
      showToast("Failed to reprocess material", "error");
    }
  };

  const onDeletePlan = async (planId) => {
    if (!window.confirm("Delete this plan and all its tasks? This cannot be undone.")) return;
    try {
      await api.delete(`/plans/${planId}`);
      setPlans((prev) => prev.filter((p) => (p._id || p.id) !== planId));
      if (activePlanId === planId) setActivePlanId(null);
    } catch { /* silent */ }
  };

  // Build display messages from cached results for current mode
  const resultKey = activeFeature === "notes"
    ? (noteType === "detailed" ? "notesDetailed" : "notes")
    : activeFeature;
  const cachedResult = results[resultKey];
  const activeMessages = cachedResult
    ? [{ role: "ai", title: resultKey.charAt(0).toUpperCase() + resultKey.slice(1), content: cachedResult, type: activeFeature }]
    : [];

  const isCached = !!cachedResult && !aiLoading;

  const onNewStudy = () => {
    const id = `session_${Date.now()}`;
    const session = {
      id,
      title: "New Study Session",
      timestamp: new Date().toLocaleString()
    };
    setSessions((prev) => [session, ...prev]);
    setActiveSessionId(id);
    setFiles([]);
    setResults({});
    setNoteType("quick");
  };

  const onSelectSession = (id) => {
    setActiveSessionId(id);
    // Restore files from session
    const session = sessions.find((s) => s.id === id);
    if (session?.files?.length) {
      setFiles(session.files);
    } else if (session?.file) {
      // backward compat: old single-file sessions
      setFiles([{ name: session.file.name, type: session.file.type, text: session.extractedText || "" }]);
    } else {
      setFiles([]);
    }
    // Restore cached results from session
    setResults(session?.results || {});
    setNoteType(session?.noteType || "quick");
    // Restore last active feature from session history
    const sessionHist = history.filter((h) => h.sessionId === id);
    if (sessionHist.length > 0) {
      setActiveFeature(sessionHist[0].type || "summary");
    }
  };

  const onLogout = async () => {
    try {
      await logout();
      showToast("Logged out", "success");
      navigate("/login", { replace: true });
    } catch {
      showToast("Could not log out", "error");
    }
  };

  // Helper: persist files + results into the session object
  const saveSessionMeta = useCallback((sessionId, updatedFiles, updatedResults, updatedNoteType) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? {
        ...s,
        files: updatedFiles ?? files,
        results: updatedResults ?? results,
        noteType: updatedNoteType ?? noteType,
        title: s.title === "New Study Session" && (updatedFiles ?? files).length
          ? (updatedFiles ?? files)[0].name
          : s.title,
      } : s))
    );
  }, [files, results, noteType]);

  const onUpload = async (file) => {
    let sessionId = activeSessionId;
    if (!sessionId) {
      const id = `session_${Date.now()}`;
      const session = { id, title: file.name, timestamp: new Date().toLocaleString() };
      setSessions((prev) => [session, ...prev]);
      setActiveSessionId(id);
      sessionId = id;
    }
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    console.log("[upload] Sending file:", file.name, "size:", file.size, "type:", file.type);
    try {
      const { data } = await api.post("/uploads", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      console.log("[upload] Response:", { success: data.success, fallback: data.fallback, textLen: (data.extractedText || "").length });

      const text = data.extractedText || data.upload?.extractedText || data.text || "";

      const newFile = { name: file.name, type: file.type, text: text || "" };
      const updatedFiles = [...files, newFile];
      setFiles(updatedFiles);
      setResults({});
      saveSessionMeta(sessionId, updatedFiles, {});
      showToast(`"${file.name}" uploaded`, "success");

      // Auto-process as material for study planning
      const ext = file.name.split(".").pop()?.toLowerCase();
      const ft = ext === "pdf" ? "pdf" : ext === "pptx" || ext === "ppt" ? "ppt" : ext === "docx" || ext === "doc" ? "doc" : "txt";
      const matPayload = {
        title: file.name,
        fileType: ft,
        extractedText: text || file.name, // send at least the filename so backend can create placeholder topic
        uploadId: data.upload?._id || data._id || undefined,
      };
      console.log("[material] Processing payload:", { title: matPayload.title, textLen: matPayload.extractedText.length });
      try {
        const { data: mat } = await api.post("/materials/process", matPayload);
        console.log("[material] Created:", mat.material?._id, "topics:", mat.material?.extractedTopics?.length);
        setMaterials((prev) => [mat.material, ...prev]);
        showToast(`Topics extracted from "${file.name}"`, "success");
      } catch (matErr) {
        console.error("[material] Processing failed:", matErr.response?.data || matErr.message);
        showToast(`Could not extract topics from "${file.name}"`, "error");
      }
    } catch (err) {
      console.error("[upload] Failed:", err.response?.data || err.message);
      showToast(err.response?.data?.message || "Upload failed", "error");
    } finally {
      setUploading(false);
    }
  };

  const onRemoveFile = (index) => {
    const updatedFiles = files.filter((_, i) => i !== index);
    setFiles(updatedFiles);
    // Clear cached results since content changed
    setResults({});
    if (activeSessionId) saveSessionMeta(activeSessionId, updatedFiles, {});
  };

  const onAction = async (action, forceRegenerate = false) => {
    if (!files.length || combinedText.trim().length < 20) {
      toast.error("Upload a file or paste text first", { id: "no-file", duration: 2000 });
      return;
    }
    if (aiLoading) return;

    setActiveFeature(action);

    // Determine cache key (notes have quick/detailed variants)
    const cacheKey = action === "notes"
      ? (noteType === "detailed" ? "notesDetailed" : "notes")
      : action;

    // Skip API if cached result exists and not forcing
    if (!forceRegenerate && results[cacheKey]) return;

    setAiLoading(action);

    try {
      const payload = { text: combinedText, mode: action };
      // Send detailLevel for notes mode
      if (action === "notes") payload.detailLevel = noteType;

      const { data } = await api.post("/ai/generate", payload);
      console.log("AI response:", data);
      const result = data.result || data.summary || data.output || "";

      // Cache the result
      const updatedResults = { ...results, [cacheKey]: result };
      setResults(updatedResults);
      if (activeSessionId) saveSessionMeta(activeSessionId, undefined, updatedResults);

      // Push to history
      setHistory((prev) => [
        { id: `hist_${Date.now()}_${Math.random().toString(36).slice(2)}`, type: action, output: result, timestamp: new Date().toLocaleString(), sessionId: activeSessionId },
        ...prev.slice(0, 29)
      ]);
    } catch (err) {
      console.error("AI action error:", err.response?.data || err.message);
      const detail = err.response?.data?.details || err.response?.data?.error || "AI processing failed.";
      showToast(detail, "error");
    } finally {
      setAiLoading("");
    }
  };

  const onRegenerate = () => {
    if (activeFeature && !aiLoading) {
      onAction(activeFeature, true); // force = true → always calls API
    }
  };

  const onImprove = async () => {
    if (!combinedText || aiLoading) return;

    // Get the current cached output for this mode
    const cacheKey = activeFeature === "notes"
      ? (noteType === "detailed" ? "notesDetailed" : "notes")
      : activeFeature;
    const currentOutput = results[cacheKey];
    if (!currentOutput) return;

    setAiLoading("improve");

    try {
      const previous = typeof currentOutput === "string" ? currentOutput : JSON.stringify(currentOutput);
      const { data } = await api.post("/ai/generate", {
        text: combinedText,
        mode: "improve",
        previous,
      });
      const result = data.result || data.output || "";

      // Replace the cached result for the current mode
      const updatedResults = { ...results, [cacheKey]: result };
      setResults(updatedResults);
      if (activeSessionId) saveSessionMeta(activeSessionId, undefined, updatedResults);
    } catch (err) {
      console.error("Improve error:", err.response?.data || err.message);
      showToast("Failed to improve output", "error");
    } finally {
      setAiLoading("");
    }
  };

  const onSelectHistory = (item) => {
    if (item.sessionId) {
      onSelectSession(item.sessionId);
    }
    setActiveFeature(item.type || "summary");
    setActiveTab("materials");
  };

  // Delete a session + all its history + messages
  const onDeleteSession = (sessionId) => {
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    setHistory((prev) => prev.filter((h) => h.sessionId !== sessionId));
    setMessages((prev) => {
      const next = { ...prev };
      delete next[sessionId];
      return next;
    });
    // If we're deleting the active session, clear workspace
    if (activeSessionId === sessionId) {
      setActiveSessionId(null);
      setFiles([]);
      setResults({});
      setActiveFeature("summary");
    }
  };

  // Rename a session
  const onRenameSession = (sessionId, newTitle) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, title: newTitle } : s))
    );
  };

  const onDeleteFile = () => {
    setFiles([]);
    setResults({});
    if (activeSessionId) saveSessionMeta(activeSessionId, [], {});
  };

  const onPasteText = (text) => {
    let sessionId = activeSessionId;
    if (!sessionId) {
      const id = `session_${Date.now()}`;
      const session = { id, title: "Pasted Text", timestamp: new Date().toLocaleString() };
      setSessions((prev) => [session, ...prev]);
      setActiveSessionId(id);
      sessionId = id;
    }
    const newFile = { name: "Pasted Text", type: "text/plain", text };
    const updatedFiles = [...files, newFile];
    setFiles(updatedFiles);
    setResults({});
    saveSessionMeta(sessionId, updatedFiles, {});
    showToast("Text added! Choose Summary, Notes, or Quiz.", "success");
  };

  const onTopicGenerate = async (topic) => {
    let sessionId = activeSessionId;
    if (!sessionId) {
      const id = `session_${Date.now()}`;
      const session = { id, title: topic, timestamp: new Date().toLocaleString() };
      setSessions((prev) => [session, ...prev]);
      setActiveSessionId(id);
      sessionId = id;
    } else {
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, title: topic } : s))
      );
    }
    // Set a placeholder file so workspace shows output area
    const topicFile = { name: `Topic: ${topic}`, type: "text/plain", text: topic };
    setFiles([topicFile]);
    setActiveFeature("summary");
    setAiLoading("summary");
    setResults({});

    try {
      const { data } = await api.post("/ai/generate", { text: topic, mode: "topic" });
      const result = data.result || data.output || "";
      const updatedResults = { summary: result };
      setResults(updatedResults);
      saveSessionMeta(sessionId, [topicFile], updatedResults);
      setHistory((prev) => [
        { id: `hist_${Date.now()}_${Math.random().toString(36).slice(2)}`, type: "summary", output: result, timestamp: new Date().toLocaleString(), sessionId },
        ...prev.slice(0, 29)
      ]);
    } catch (err) {
      console.error("Topic generate error:", err.response?.data || err.message);
      toast.error(err.response?.data?.error || "Failed to generate topic material", { id: "topic-err" });
    } finally {
      setAiLoading("");
    }
  };

  const onPlanGenerated = (plan) => {
    const id = `plan_${Date.now()}`;
    setStudyPlans((prev) => [
      { id, title: plan.topic, timestamp: new Date().toLocaleString() },
      ...prev
    ]);
  };

  // Switch mode: just change activeFeature (display from cache, no API call)
  const onFeatureChange = (feature) => {
    setActiveFeature(feature);
  };

  // Notes detail toggle
  const onNoteTypeChange = (type) => {
    setNoteType(type);
  };

  // Keyboard shortcuts: S → Summary, N → Notes, Q → Quiz
  useEffect(() => {
    const handleKey = (e) => {
      // Skip if user is typing in input/textarea
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const key = e.key.toLowerCase();
      if (key === "s") { e.preventDefault(); setActiveFeature("summary"); if (!results.summary) onAction("summary"); }
      else if (key === "n") { e.preventDefault(); setActiveFeature("notes"); const nk = noteType === "detailed" ? "notesDetailed" : "notes"; if (!results[nk]) onAction("notes"); }
      else if (key === "q") { e.preventDefault(); setActiveFeature("quiz"); if (!results.quiz) onAction("quiz"); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [files, combinedText, aiLoading, activeSessionId, results, noteType]);

  return (
    <MotivationProvider>
    <div
      className="flex h-screen overflow-hidden bg-[var(--bg-base)] text-[var(--text-primary)]"
      style={{ transition: "background-color 0.2s ease, color 0.2s ease" }}
    >
      <DashboardSidebar
        sessions={sessions}
        studyPlans={studyPlans}
        activeSessionId={activeSessionId}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onNewStudy={() => { setActiveTab("materials"); onNewStudy(); }}
        onSelectSession={(id) => { setActiveTab("materials"); onSelectSession(id); }}
        onSelectHistory={onSelectHistory}
        onDeleteSession={onDeleteSession}
        onRenameSession={onRenameSession}
        onClearHistory={() => {
          setHistory([]);
          localStorage.removeItem("sp_history");
        }}
        onDeleteHistoryItem={(item) => {
          // Optimistic update first
          setHistory((prev) =>
            item.id
              ? prev.filter((h) => h.id !== item.id)
              : prev.filter((h) => h !== item)
          );
          // Fire-and-forget backend sync (best effort)
          if (item.id) api.delete(`/history/${item.id}`).catch(() => {});
        }}
        onLogout={onLogout}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        history={history}
        materials={materials}
        selectedMaterialIds={selectedMaterialIds}
        onToggleMaterial={onToggleMaterial}
        onMaterialQuickAction={onMaterialQuickAction}
        plans={plans}
        onSelectPlan={onSelectPlan}
        onDeletePlan={onDeletePlan}
        onDeleteMaterial={onDeleteMaterial}
        onReprocessMaterial={onReprocessMaterial}
        activePlanId={activePlanId}
      />

      <main className="flex flex-1 flex-col gap-4 overflow-y-auto p-6" style={{ backgroundColor: "var(--bg-base)" }}>
        {/* Topbar */}
        <div className="flex items-center justify-between rounded-xl border border-[var(--border-color)] bg-[var(--bg-panel)] px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Link
              to="/profile"
              className="flex items-center gap-2 rounded-lg px-2 py-1 transition hover:bg-[var(--bg-surface)]"
            >
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-black"
                style={{ backgroundColor: "var(--accent)" }}
              >
                {user?.username?.slice(0, 1).toUpperCase() || "A"}
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)] leading-tight">{user?.username || "Learner"}</p>
                <p className="text-[10px] text-[var(--text-muted)]">{user?.email}</p>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPomoOpen(true)}
              className="flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold text-black transition active:scale-95 hover:opacity-90"
              style={{ backgroundColor: "var(--accent)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              Focus Session
            </button>
            <NotificationBell />
          </div>
        </div>
        {activeTab === "plans" ? (
          <>
            <MotivationBanner taskJustCompleted={lastTaskDone} />
            <ProgressWidgets refreshTrigger={progressRefresh} />
            <StudyMode
              materials={materials}
              selectedMaterialIds={selectedMaterialIds}
              onToggleMaterial={onToggleMaterial}
              onSelectAllMaterials={onSelectAllMaterials}
              plans={plans}
              onPlanCreated={fetchPlans}
              onPlanDeleted={fetchPlans}
              onTaskToggled={() => {
                setProgressRefresh((n) => n + 1);
                setLastTaskDone(true);
                setTimeout(() => setLastTaskDone(false), 2000);
                fetchPlans();
              }}
            />
          </>
        ) : (
          <>
            {/* Enhanced home state when materials exist but no active file */}
            {files.length === 0 && materials.length > 0 ? (
              <DashboardHome
                materials={materials}
                onMaterialAction={onMaterialQuickAction}
                onUpload={onUpload}
                weakTopics={weakTopics}
                onTopicClick={onWeakTopicQuiz}
                onAddTopic={onAddTopic}
                lastMaterial={lastMaterial}
                onResumeStudy={onResumeStudy}
              />
            ) : (
              <>
                {/* Upload + Actions */}
                <UploadBar
                  onUpload={onUpload}
                  onAction={onAction}
                  onDeleteFile={onDeleteFile}
                  onRemoveFile={onRemoveFile}
                  files={files}
                  uploading={uploading}
                  aiLoading={aiLoading}
                  activeFeature={activeFeature}
                  onFeatureChange={onFeatureChange}
                  results={results}
                  noteType={noteType}
                  onNoteTypeChange={onNoteTypeChange}
                />

                {/* AI Workspace */}
                <Workspace
                  messages={activeMessages}
                  activeFeature={activeFeature}
                  aiLoading={aiLoading}
                  onRegenerate={onRegenerate}
                  onImprove={onImprove}
                  onUpload={onUpload}
                  onPasteText={onPasteText}
                  onTopicGenerate={onTopicGenerate}
                  hasFile={files.length > 0}
                  isCached={isCached}
                />
              </>
            )}
          </>
        )}
      </main>

      {/* StudyPanel slide-in */}
      {studyPanelMaterial && (
        <StudyPanel
          material={studyPanelMaterial}
          initialTab={studyPanelTab}
          onClose={() => setStudyPanelMaterial(null)}
          onStartQuiz={onStartQuiz}
          onTabChange={onStudyPanelTabChange}
        />
      )}

      {/* Pomodoro fullscreen */}
      <PomodoroModal
        open={pomoOpen}
        onClose={() => setPomoOpen(false)}
      />

      {/* Motivation flashcard popup */}
      <MotivationCard />
      <MotivationTrigger />

      {/* Full-screen quiz overlay */}
      {quizSession && (
        <QuizScreen
          questions={quizSession.questions}
          materialTitle={quizSession.materialTitle}
          onClose={() => setQuizSession(null)}
          onQuizComplete={onQuizComplete}
        />
      )}
    </div>
    </MotivationProvider>
  );
}

