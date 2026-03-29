import { useState, useEffect, useRef } from "react";
import {
  Sparkles, Loader2, ChevronLeft, ChevronRight, Check,
  Flame, Clock, CalendarDays, Target, Play, Pause, RotateCcw,
  Bell, BellOff, CheckCircle2, Circle, ChevronDown, Zap,
  AlertTriangle, FileText, Sliders, Rocket, BookOpen, Maximize2,
  ArrowLeft, Plus, Trash2, Download, ExternalLink, Sheet
} from "lucide-react";
import { exportExcel } from "../../utils/export/exportExcel";
import toast from "react-hot-toast";
import showToast from "../../lib/showToast";
import api from "../../lib/api";
import { useMotivation } from "../../hooks/useMotivation";
import PomodoroModal from "./PomodoroModal";

/* ── helpers ─────────────────────────────────────── */
function dateKey(d = new Date()) { return d.toISOString().slice(0, 10); }
function addDays(date, n) { const d = new Date(date + "T12:00:00"); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
function daysArray(year, month) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const days = [];
  for (let i = 0; i < first.getDay(); i++) days.push(null);
  for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d));
  return days;
}
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const WEEKDAYS = ["Su","Mo","Tu","We","Th","Fr","Sa"];
function formatMins(m) { if (!m) return "0m"; if (m < 60) return `${m}m`; const h = Math.floor(m / 60); const r = m % 60; return r ? `${h}h ${r}m` : `${h}h`; }

const MODE_CONFIG = {
  auto:         { label: "Auto",         icon: Sparkles, desc: "AI distributes evenly across days" },
  custom:       { label: "Custom",       icon: Sliders,  desc: "You set hours per day" },
  finish_today: { label: "Finish Today", icon: Rocket,   desc: "All tasks in one session" },
};

/* ── Resource suggestion helper ──────────────────── */
function getResourcesForTopic(topic) {
  const query = encodeURIComponent(topic);
  return [
    { title: "YouTube",        icon: "🎥", url: `https://www.youtube.com/results?search_query=${query}`,           color: "text-red-400",    bg: "bg-red-400/10" },
    { title: "Google",         icon: "🌐", url: `https://www.google.com/search?q=${query}`,                        color: "text-blue-400",   bg: "bg-blue-400/10" },
    { title: "GeeksforGeeks",  icon: "📄", url: `https://www.google.com/search?q=${query}+geeksforgeeks`,          color: "text-green-400",  bg: "bg-green-400/10" },
    { title: "Wikipedia",      icon: "📚", url: `https://en.wikipedia.org/w/index.php?search=${query}`,            color: "text-purple-400", bg: "bg-purple-400/10" },
    { title: "Stack Overflow",  icon: "💬", url: `https://www.google.com/search?q=${query}+site:stackoverflow.com`, color: "text-orange-400", bg: "bg-orange-400/10" },
  ];
}

export default function StudyMode({ materials = [], selectedMaterialIds = [], onToggleMaterial, onSelectAllMaterials, onTaskToggled, plans = [], onPlanCreated, onPlanDeleted }) {
  const { showCard } = useMotivation();
  /* ── plan creation state ────────────────────────── */
  const [planMode, setPlanMode] = useState("auto");
  const [totalHours, setTotalHours] = useState("6");
  const [planDays, setPlanDays] = useState("7");
  const [customDailyHours, setCustomDailyHours] = useState([]);
  const [generating, setGenerating] = useState(false);

  /* ── active plan view ───────────────────────────── */
  const [activePlan, setActivePlan] = useState(null);
  const [planTasks, setPlanTasks] = useState([]);
  const [warnings, setWarnings] = useState([]);

  /* ── calendar ───────────────────────────────────── */
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState(dateKey());

  /* ── pomodoro ───────────────────────────────────── */
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [pomoOpen, setPomoOpen] = useState(false);

  /* ── expanding subtasks ─────────────────────────── */
  const [expandedTask, setExpandedTask] = useState(null);
  const [expandingId, setExpandingId] = useState(null);

  /* ── resource panel ─────────────────────────────── */
  const [resourceTaskId, setResourceTaskId] = useState(null);

  /* ── inline action loading ──────────────────────── */
  const [togglingTaskId, setTogglingTaskId] = useState(null);
  const [rebalancing, setRebalancing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  /* ── view mode ──────────────────────────────────── */
  const [planView, setPlanView] = useState("days"); // "days" | "calendar"

  const todayKey = dateKey();

  // Estimated time from selected materials
  const selectedMaterials = materials.filter((m) => selectedMaterialIds.includes(m._id || m.id));
  const totalEstMins = selectedMaterials.reduce((s, m) => s + (m.totalEstimatedMinutes || 0), 0);

  // When planDays changes in custom mode, init daily hours array
  useEffect(() => {
    if (planMode === "custom") {
      const d = Number(planDays) || 1;
      const perDay = Number(totalHours) / d;
      setCustomDailyHours(Array(d).fill(Math.round(perDay * 10) / 10));
    }
  }, [planDays, planMode]);

  // Group tasks by date
  const tasksByDate = {};
  planTasks.forEach((t) => {
    const k = t.assignedDate || "unscheduled";
    if (!tasksByDate[k]) tasksByDate[k] = [];
    tasksByDate[k].push(t);
  });

  const selectedDayTasks = tasksByDate[selectedDate] || [];
  const allDates = Object.keys(tasksByDate).filter((d) => d !== "unscheduled").sort();
  const unscheduled = tasksByDate["unscheduled"] || [];

  // Stats
  const totalTasks = planTasks.length;
  const doneTasks = planTasks.filter((t) => t.status === "done").length;
  const todayTasks = tasksByDate[todayKey] || [];
  const todayDone = todayTasks.filter((t) => t.status === "done").length;

  /* ── plans come from parent via props ───────────── */

  /* ── Delete a plan ──────────────────────────────── */
  const handleDeletePlan = async (planId, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Delete this plan and all its tasks? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await api.delete(`/plans/${planId}`);
      if (activePlan && (activePlan._id || activePlan.id) === planId) {
        setActivePlan(null);
        setPlanTasks([]);
        setWarnings([]);
      }
      onPlanDeleted?.();
      showToast("Plan deleted successfully", "success");
    } catch {
      showToast("Failed to delete plan", "error");
    } finally {
      setDeleting(false);
    }
  };

  /* ── Select a plan to view ──────────────────────── */
  const viewPlan = async (planId) => {
    try {
      const { data } = await api.get(`/plans/${planId}`);
      setActivePlan(data.plan);
      setPlanTasks(data.tasks || []);
      // Jump calendar to first task date
      const firstDate = data.tasks?.find((t) => t.assignedDate)?.assignedDate;
      if (firstDate) {
        const d = new Date(firstDate + "T12:00:00");
        setCalMonth(d.getMonth());
        setCalYear(d.getFullYear());
        setSelectedDate(firstDate);
      }
    } catch {
      showToast("Failed to load plan", "error");
    }
  };

  /* ── Create plan ────────────────────────────────── */
  const handleCreatePlan = async () => {
    if (!selectedMaterialIds.length) {
      toast.error("Select at least one material to create a plan", { id: "no-mat" });
      return;
    }
    const hrs = Number(totalHours);
    if (!hrs || hrs <= 0) { toast.error("Enter total hours"); return; }

    setGenerating(true);
    setWarnings([]);

    try {
      const payload = {
        materialIds: selectedMaterialIds,
        mode: planMode,
        totalHours: hrs,
        days: planMode === "finish_today" ? 1 : Number(planDays) || 7,
        startDate: dateKey(),
      };

      if (planMode === "custom") {
        payload.dailyHours = customDailyHours;
      }

      console.log("[createPlan] Sending payload:", JSON.stringify(payload));
      const { data } = await api.post("/plans/create", payload);
      console.log("[createPlan] Plan response:", { planId: data.plan?._id, tasks: data.tasks?.length, warnings: data.warnings?.length });
      console.log("[createPlan] First 3 tasks:", data.tasks?.slice(0, 3).map(t => ({ topic: t.topic, material: t.material?.title, date: t.assignedDate })));
      setActivePlan(data.plan);
      setPlanTasks(data.tasks || []);
      if (data.warnings?.length) setWarnings(data.warnings);
      onPlanCreated?.(); // refresh parent plans list

      // Jump to first day
      const firstDate = data.tasks?.find((t) => t.assignedDate)?.assignedDate;
      if (firstDate) {
        const d = new Date(firstDate + "T12:00:00");
        setCalMonth(d.getMonth());
        setCalYear(d.getFullYear());
        setSelectedDate(firstDate);
      }

      showToast("Study plan created successfully", "success");
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to create plan", "error");
    } finally {
      setGenerating(false);
    }
  };

  /* ── Toggle task ────────────────────────────────── */
  const toggleTask = async (taskId) => {
    setTogglingTaskId(taskId);
    try {
      const { data } = await api.patch(`/plans/tasks/${taskId}`);
      const updatedTasks = planTasks.map((t) => (t._id === taskId ? { ...t, status: data.task.status } : t));
      setPlanTasks(updatedTasks);
      onTaskToggled?.(); // notify parent to refresh progress widgets + plans

      if (data.task.status === "done") {
        // Check if all today's tasks are now done
        const todaysDone = updatedTasks.filter((t) => t.assignedDate === todayKey);
        const allTodayDone = todaysDone.length > 0 && todaysDone.every((t) => t.status === "done");

        if (allTodayDone) {
          showCard({ type: "success", title: "Day completed!", message: "All tasks done for today — you crushed it! 🔥" });
        } else {
          showCard({ type: "success", title: "Nice work!", message: "1 step closer to your goal 🎉" });
        }

        // Streak card
        if (data.gamification?.streakUpdated && data.gamification?.streak > 1) {
          showCard({ type: "streak", title: `${data.gamification.streak}-day streak!`, message: "You're on fire — keep it going! ⚡" });
        }

        // Level up card
        if (data.gamification?.levelUp) {
          showCard({ type: "progress", title: "Level up!", message: `You reached Level ${data.gamification.level} 🏆` });
        }
      } else {
        showToast("Task reopened", "info");
      }
    } catch {
      showToast("Failed to update task", "error");
    } finally {
      setTogglingTaskId(null);
    }
  };

  /* ── Rebalance ──────────────────────────────────── */
  const handleRebalance = async () => {
    if (!activePlan) return;
    setRebalancing(true);
    try {
      const { data } = await api.post(`/plans/${activePlan._id}/rebalance`);
      setPlanTasks(data.tasks || []);
      const s = data.stats;
      if (s && s.pending > 0) {
        showToast(`${s.pending} task${s.pending !== 1 ? "s" : ""} redistributed across ${s.days} day${s.days !== 1 ? "s" : ""} starting today`, "success");
      } else {
        showToast(data.message || "Plan rebalanced", "success");
      }
    } catch {
      showToast("Rebalance failed", "error");
    } finally {
      setRebalancing(false);
    }
  };

  /* ── export plan as Excel (.xlsx) ──────────────── */
  const [downloading, setDownloading] = useState(false);
  const handleDownloadPlan = async () => {
    if (!activePlan || !planTasks.length) return;
    if (downloading) return;
    setDownloading(true);
    try {
      const allDates = [...new Set(
        planTasks.map((t) => t.assignedDate).filter(Boolean).sort()
      )];
      const dateToDay = {};
      allDates.forEach((d, i) => { dateToDay[d] = i + 1; });

      const rows = planTasks.map((t) => ({
        day:        t.assignedDate ? (dateToDay[t.assignedDate] ?? "") : "",
        date:       t.assignedDate || "Unscheduled",
        topic:      t.topic || "",
        material:   t.material?.title || "",
        time:       t.estimatedTime || "",
        difficulty: t.difficulty || "medium",
        status:     t.status || "pending",
      }));

      const blob = await exportExcel(rows);
      if (blob) showToast("Exported as Excel!", "success");
    } catch {
      showToast("Failed to export Excel", "error");
    } finally {
      setDownloading(false);
    }
  };

  /* ── AI micro-tasks ─────────────────────────────── */
  const expandMicroTasks = async (task) => {
    const tid = task._id;
    if (expandedTask === tid) { setExpandedTask(null); return; }
    if (task.subtasks?.length) { setExpandedTask(tid); return; }

    setExpandingId(tid);
    try {
      const { data } = await api.post("/ai/generate", { text: task.topic, mode: "microtasks" });
      const subs = Array.isArray(data.result) ? data.result : [];
      setPlanTasks((prev) =>
        prev.map((t) => (t._id === tid ? { ...t, subtasks: subs.map((s) => ({ text: s, done: false })) } : t))
      );
      setExpandedTask(tid);
    } catch {
      showToast("Failed to break down task", "error");
    } finally {
      setExpandingId(null);
    }
  };

  /* ── Reminders ──────────────────────────────────── */
  const enableReminders = async () => {
    if (!"Notification" in window) { showToast("Not supported", "error"); return; }
    const perm = await Notification.requestPermission();
    if (perm === "granted") { setRemindersEnabled(true); showToast("Reminders on!", "success"); }
    else showToast("Permission denied", "error");
  };

  useEffect(() => {
    if (!remindersEnabled) return;
    const id = setInterval(() => {
      const now = new Date();
      const pending = (tasksByDate[dateKey(now)] || []).filter((t) => t.status === "pending");
      if (pending.length > 0 && now.getMinutes() === 0) {
        new Notification("AI Study Pal", { body: `You have ${pending.length} pending task${pending.length > 1 ? "s" : ""} today!` });
      }
    }, 60000);
    return () => clearInterval(id);
  }, [remindersEnabled, planTasks]);

  /* ── Calendar data ──────────────────────────────── */
  const calDays = daysArray(calYear, calMonth);
  const prevMonth = () => { if (calMonth === 0) { setCalMonth(11); setCalYear((y) => y - 1); } else setCalMonth((m) => m - 1); };
  const nextMonth = () => { if (calMonth === 11) { setCalMonth(0); setCalYear((y) => y + 1); } else setCalMonth((m) => m + 1); };

  // Update custom daily hours
  const updateDayHours = (idx, val) => {
    setCustomDailyHours((prev) => {
      const next = [...prev];
      next[idx] = Math.max(0, Number(val) || 0);
      return next;
    });
  };

  /* ── Render ─────────────────────────────────────── */
  return (
    <div className="space-y-6">
      {/* ── Active Plan Header ──────────────────── */}
      {activePlan && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setActivePlan(null); setPlanTasks([]); setWarnings([]); }}
              className="rounded-lg p-2 text-[var(--text-muted)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
              title="Back to plans"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">{activePlan.title}</h3>
              <p className="text-[10px] text-[var(--text-faint)] uppercase tracking-wider">{activePlan.mode?.replace("_", " ")} &middot; {totalTasks} tasks</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setActivePlan(null); setPlanTasks([]); setWarnings([]); }}
              className="flex items-center gap-1.5 rounded-lg bg-[var(--bg-card)] px-3 py-1.5 text-xs text-[var(--text-muted)] transition hover:text-[var(--accent)] hover:border-[var(--accent)] border border-[var(--border-color)]"
            >
              <Plus size={12} />
              New Plan
            </button>
            <button
              onClick={() => handleDeletePlan(activePlan._id || activePlan.id)}
              className="flex items-center gap-1.5 rounded-lg bg-[var(--bg-card)] px-3 py-1.5 text-xs text-red-400 transition hover:bg-red-500/10 hover:border-red-500 border border-[var(--border-color)]"
              title="Delete this plan"
            >
              <Trash2 size={12} />
              Delete
            </button>
          </div>
        </div>
      )}

      {/* ── Stats Cards ─────────────────────────────── */}
      {activePlan && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard icon={CheckCircle2} color="text-green-400" bg="bg-green-400/10"
            label="Overall" value={`${doneTasks}/${totalTasks}`} />
          <StatCard icon={Target} color="text-[var(--accent)]" bg="bg-[var(--bg-card)]"
            label="Today" value={todayTasks.length > 0 ? `${todayDone}/${todayTasks.length}` : "—"} />
          <StatCard icon={CalendarDays} color="text-blue-400" bg="bg-blue-400/10"
            label="Days" value={`${allDates.length}`} />
          <StatCard icon={Clock} color="text-purple-400" bg="bg-purple-400/10"
            label="Total Time" value={formatMins(planTasks.reduce((s, t) => s + (t.allocatedMinutes || 0), 0))} />
        </div>
      )}

      {/* ── Plan Summary Banner ─────────────────────── */}
      {activePlan && totalTasks > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] px-5 py-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
              <Clock size={13} className="text-[var(--accent)]" />
              Total Plan Time: <span className="font-bold text-[var(--text-primary)]">{formatMins(planTasks.reduce((s, t) => s + (t.allocatedMinutes || 0), 0))}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
              <CalendarDays size={13} className="text-blue-400" />
              Days: <span className="font-bold text-[var(--text-primary)]">{allDates.length}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
              <Target size={13} className="text-green-400" />
              Tasks: <span className="font-bold text-[var(--text-primary)]">{totalTasks}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            {(() => { const h = planTasks.filter(t => (t.difficulty||"medium")==="hard").length, m = planTasks.filter(t => (t.difficulty||"medium")==="medium").length, e = planTasks.filter(t => (t.difficulty||"medium")==="easy").length; return (<>
              {h > 0 && <span className="rounded-full bg-red-400/10 px-2 py-0.5 font-semibold text-red-400">{h} Hard</span>}
              {m > 0 && <span className="rounded-full bg-blue-400/10 px-2 py-0.5 font-semibold text-blue-400">{m} Medium</span>}
              {e > 0 && <span className="rounded-full bg-green-400/10 px-2 py-0.5 font-semibold text-green-400">{e} Easy</span>}
            </>); })()}
          </div>
        </div>
      )}

      {/* ── Plan Creator (hidden when viewing a plan) ── */}
      {!activePlan && (
      <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-5">
        <div className="mb-1 flex items-center gap-2">
          <Sparkles size={18} className="text-[var(--accent)]" />
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Create Study Plan</h3>
        </div>
        <p className="mb-4 text-[11px] text-[var(--text-muted)]">Select materials to generate your study plan</p>

        {/* Material selector */}
        {materials.length > 0 ? (
          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] text-[var(--text-muted)]">
                {selectedMaterialIds.length > 0
                  ? <><span className="font-semibold text-[var(--text-primary)]">{selectedMaterialIds.length}</span> of {materials.length} selected</>
                  : `${materials.length} material${materials.length !== 1 ? "s" : ""} available`}
              </p>
              {onSelectAllMaterials && materials.length > 1 && (
                <button
                  onClick={onSelectAllMaterials}
                  className="text-[10px] font-semibold transition hover:underline"
                  style={{ color: 'var(--accent)' }}
                >
                  {selectedMaterialIds.length === materials.length ? "Deselect All" : "Select All"}
                </button>
              )}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {materials.map((m) => {
                const id = m._id || m.id;
                const isSelected = selectedMaterialIds.includes(id);
                const topicCount = m.extractedTopics?.length || 0;
                return (
                  <button
                    key={id}
                    onClick={() => onToggleMaterial?.(id)}
                    className={`group flex items-start gap-2.5 rounded-lg border p-3 text-left transition-all duration-150 ${
                      isSelected
                        ? "border-transparent"
                        : "border-[var(--border-color)] bg-[var(--bg-card)] hover:border-[var(--text-faint)]"
                    }`}
                    style={isSelected ? {
                      borderColor: 'var(--accent)',
                      backgroundColor: 'color-mix(in srgb, var(--accent) 8%, var(--bg-card))',
                      boxShadow: '0 0 12px color-mix(in srgb, var(--accent) 15%, transparent)'
                    } : {}}
                  >
                    <div
                      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
                        isSelected ? "border-transparent" : "border-zinc-600"
                      }`}
                      style={isSelected ? { backgroundColor: 'var(--accent)', borderColor: 'var(--accent)' } : {}}
                    >
                      {isSelected && <Check size={10} className="text-black" strokeWidth={3} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--text-primary)]">{m.title}</p>
                      <div className="mt-0.5 flex items-center gap-2 flex-wrap">
                        {m.subject && (
                          <span className="text-[10px] font-medium" style={{ color: 'var(--accent)' }}>{m.subject}</span>
                        )}
                        {topicCount > 0 && (
                          <span className="text-[10px] text-[var(--text-faint)]">{topicCount} topic{topicCount !== 1 ? "s" : ""}</span>
                        )}
                        {m.totalEstimatedMinutes > 0 && (
                          <span className="flex items-center gap-0.5 text-[10px] text-[var(--text-faint)]">
                            <Clock size={8} /> {formatMins(m.totalEstimatedMinutes)}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            {materials.length > 1 && (
              <p className="mt-2 text-[10px] text-[var(--text-faint)] italic">Select multiple subjects to create mixed study days</p>
            )}
            {totalEstMins > 0 && selectedMaterialIds.length > 0 && (
              <div className="mt-2 flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                <Clock size={10} /> AI estimate: <span className="font-semibold text-[var(--text-primary)]">{formatMins(totalEstMins)}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="mb-4 rounded-lg border border-dashed border-[var(--border-color)] bg-[var(--bg-card)] p-6 text-center">
            <BookOpen size={24} className="mx-auto mb-2 text-[var(--text-faint)]" />
            <p className="text-xs font-medium text-[var(--text-muted)]">No materials uploaded yet</p>
            <p className="mt-1 text-[10px] text-[var(--text-faint)]">Upload a file from the Materials tab to get started</p>
          </div>
        )}

        {/* Mode toggle */}
        <div className="mb-4 flex gap-2">
          {Object.entries(MODE_CONFIG).map(([key, cfg]) => {
            const Icon = cfg.icon;
            const active = planMode === key;
            return (
              <button
                key={key}
                onClick={() => setPlanMode(key)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                  active
                    ? "text-black"
                    : "bg-[var(--bg-card)] text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                }`}
                style={active ? { backgroundColor: 'var(--accent)' } : {}}
              >
                <Icon size={12} />
                {cfg.label}
              </button>
            );
          })}
        </div>
        <p className="mb-4 text-[11px] text-[var(--text-faint)]">{MODE_CONFIG[planMode].desc}</p>

        {/* Inputs */}
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Total Hours</label>
            <input
              value={totalHours}
              onChange={(e) => setTotalHours(e.target.value)}
              type="number"
              min="1"
              max="500"
              className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />
          </div>
          {planMode !== "finish_today" && (
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Number of Days</label>
              <input
                value={planDays}
                onChange={(e) => setPlanDays(e.target.value)}
                type="number"
                min="1"
                max="90"
                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
              />
            </div>
          )}
          <div className={`flex items-end ${planMode === "finish_today" ? "sm:col-span-2" : ""}`}>
            <button
              onClick={handleCreatePlan}
              disabled={generating || !selectedMaterialIds.length || !Number(totalHours) || (planMode !== "finish_today" && !Number(planDays))}
              className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-black transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {generating ? "Creating…" : "Create Plan"}
            </button>
          </div>
        </div>

        {/* Custom per-day sliders */}
        {planMode === "custom" && customDailyHours.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Hours per day</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {customDailyHours.map((hrs, i) => {
                const dateStr = addDays(dateKey(), i);
                const d = new Date(dateStr + "T12:00:00");
                const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                const overload = hrs > 8;
                return (
                  <div key={i} className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
                    overload ? "border-red-500/40 bg-red-500/5" : "border-[var(--border-color)] bg-[var(--bg-card)]"
                  }`}>
                    <span className="text-xs text-[var(--text-muted)] w-16">{label}</span>
                    <input
                      type="range"
                      min="0" max="12" step="0.5"
                      value={hrs}
                      onChange={(e) => updateDayHours(i, e.target.value)}
                      className="flex-1 range-accent h-1.5"
                    />
                    <span className={`text-xs font-semibold w-10 text-right ${overload ? "text-red-400" : "text-[var(--text-primary)]"}`}>
                      {hrs}h
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-[var(--text-faint)]">
              Total: <span className="text-[var(--text-primary)] font-medium">{customDailyHours.reduce((a, b) => a + b, 0).toFixed(1)}h</span>
              {" / "}{totalHours}h target
            </p>
          </div>
        )}
      </div>
      )}

      {/* ── Warnings ────────────────────────────────── */}
      {warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 rounded-lg border border-orange-500/30 bg-orange-500/5 p-3">
              <AlertTriangle size={14} className="mt-0.5 shrink-0 text-orange-400" />
              <span className="text-xs text-orange-300">{w.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Active Plan ─────────────────────────────── */}
      {activePlan && (
        <div className="space-y-4">
          {/* View toggle + actions bar */}
          {activePlan.mode !== "finish_today" && (
            <div className="flex items-center justify-between">
              <div className="flex gap-1.5 rounded-lg bg-[var(--bg-card)] p-1">
                {[
                  { key: "days", label: "Day View", icon: CalendarDays },
                  { key: "calendar", label: "Calendar", icon: Target },
                ].map(({ key, label, icon: Ic }) => (
                  <button
                    key={key}
                    onClick={() => setPlanView(key)}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                      planView === key ? "text-black" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    }`}
                    style={planView === key ? { backgroundColor: "var(--accent)" } : {}}
                  >
                    <Ic size={12} />
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={remindersEnabled ? () => setRemindersEnabled(false) : enableReminders}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition ${
                    remindersEnabled ? "text-[var(--accent)]" : "bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  }`}
                  style={remindersEnabled ? { backgroundColor: "rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.1)" } : {}}
                >
                  {remindersEnabled ? <Bell size={12} /> : <BellOff size={12} />}
                  {remindersEnabled ? "On" : "Remind"}
                </button>
                <button
                  onClick={handleRebalance}
                  disabled={rebalancing}
                  className="flex items-center gap-1.5 rounded-lg bg-[var(--bg-card)] px-3 py-1.5 text-xs text-[var(--text-muted)] transition hover:text-[var(--accent)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {rebalancing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  {rebalancing ? "Rebalancing…" : "Rebalance"}
                </button>
                <button
                  onClick={handleDownloadPlan}
                  disabled={downloading}
                  className="flex items-center gap-1.5 rounded-lg bg-[var(--bg-card)] px-3 py-1.5 text-xs text-[var(--text-muted)] transition hover:text-[var(--accent)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {downloading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                  {downloading ? "Exporting…" : "Export as Excel"}
                </button>
              </div>
            </div>
          )}

          {/* Overall progress */}
          {totalTasks > 0 && (
            <div className="rounded-full bg-[var(--bg-hover)] h-2 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${(doneTasks / totalTasks) * 100}%`, backgroundColor: "var(--accent)" }}
              />
            </div>
          )}

          {/* Download button for finish_today mode (no actions bar) */}
          {activePlan.mode === "finish_today" && (
            <div className="flex justify-end">
              <button
                onClick={handleDownloadPlan}
                disabled={downloading}
                className="flex items-center gap-1.5 rounded-lg bg-[var(--bg-card)] px-3 py-1.5 text-xs text-[var(--text-muted)] transition hover:text-[var(--accent)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {downloading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                {downloading ? "Exporting…" : "Export as Excel"}
              </button>
            </div>
          )}

          {/* ── DAY VIEW: All days as cards ──────────── */}
          {(planView === "days" || activePlan.mode === "finish_today") && (
            <div className="space-y-4">
              {activePlan.mode === "finish_today" ? (
                <DayCard
                  label="All Tasks"
                  dateStr={null}
                  tasks={planTasks}
                  isToday={true}
                  onToggle={toggleTask}
                  onExpand={expandMicroTasks}
                  expandedTask={expandedTask}
                  expandingId={expandingId}
                  togglingTaskId={togglingTaskId}
                  resourceTaskId={resourceTaskId}
                  onToggleResources={setResourceTaskId}
                />
              ) : (
                <>
                  {allDates.length === 0 && (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--bg-surface)] py-16 text-center">
                      <BookOpen size={32} className="text-[var(--text-faint)] mb-3" />
                      <p className="text-sm font-medium text-[var(--text-muted)]">Select materials and create your first smart study plan</p>
                      <p className="mt-1 text-xs text-[var(--text-faint)]">Choose materials from the left, set your hours, and let AI build your schedule</p>
                    </div>
                  )}
                  {allDates.map((dk, dayIdx) => (
                    <DayCard
                      key={dk}
                      label={null}
                      dateStr={dk}
                      dayNumber={dayIdx + 1}
                      tasks={tasksByDate[dk] || []}
                      isToday={dk === todayKey}
                      onToggle={toggleTask}
                      onExpand={expandMicroTasks}
                      expandedTask={expandedTask}
                      expandingId={expandingId}
                      togglingTaskId={togglingTaskId}
                      resourceTaskId={resourceTaskId}
                      onToggleResources={setResourceTaskId}
                    />
                  ))}
                  {unscheduled.length > 0 && (
                    <DayCard
                      label="Unscheduled"
                      dateStr={null}
                      tasks={unscheduled}
                      isToday={false}
                      onToggle={toggleTask}
                      onExpand={expandMicroTasks}
                      expandedTask={expandedTask}
                      expandingId={expandingId}
                      togglingTaskId={togglingTaskId}
                      resourceTaskId={resourceTaskId}
                      onToggleResources={setResourceTaskId}
                    />
                  )}
                </>
              )}
            </div>
          )}

          {/* ── CALENDAR VIEW: Original calendar + selected day ── */}
          {planView === "calendar" && activePlan.mode !== "finish_today" && (
            <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
              {/* Left: Calendar */}
              <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <button onClick={prevMonth} className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition">
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-sm font-semibold text-[var(--text-primary)]">{MONTHS[calMonth]} {calYear}</span>
                  <button onClick={nextMonth} className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition">
                    <ChevronRight size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-7 mb-1">
                  {WEEKDAYS.map((w) => (
                    <div key={w} className="py-1 text-center text-[10px] font-semibold uppercase tracking-widest text-[var(--text-faint)]">{w}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {calDays.map((day, i) => {
                    if (!day) return <div key={`e-${i}`} />;
                    const dk = dateKey(day);
                    const isToday = dk === todayKey;
                    const isSelected = dk === selectedDate;
                    const dayTasks = tasksByDate[dk] || [];
                    const hasTasks = dayTasks.length > 0;
                    const allDone = hasTasks && dayTasks.every((t) => t.status === "done");
                    const someDone = hasTasks && dayTasks.some((t) => t.status === "done") && !allDone;
                    return (
                      <button
                        key={dk}
                        onClick={() => setSelectedDate(dk)}
                        className={[
                          "relative flex flex-col items-center rounded-lg py-1.5 text-xs transition-all duration-150",
                          isSelected ? "font-bold"
                            : isToday ? "bg-[var(--bg-hover)] text-[var(--text-primary)] font-semibold"
                            : "text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]",
                        ].join(" ")}
                        style={isSelected ? { backgroundColor: "rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.15)", color: "var(--accent)" } : {}}
                      >
                        {day.getDate()}
                        {hasTasks && (
                          <span className={`mt-0.5 h-1 w-1 rounded-full ${allDone ? "bg-green-400" : someDone ? "bg-[var(--accent)]" : "bg-[var(--text-faint)]"}`} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right: Selected day tasks */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">
                      {selectedDate === todayKey
                        ? "Today"
                        : new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                    </h3>
                    {selectedDayTasks.length > 0 && (
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        {selectedDayTasks.filter((t) => t.status === "done").length} of {selectedDayTasks.length} completed
                      </p>
                    )}
                  </div>
                </div>
                <TaskList
                  tasks={selectedDayTasks}
                  onToggle={toggleTask}
                  onExpand={expandMicroTasks}
                  expandedTask={expandedTask}
                  expandingId={expandingId}
                  emptyMessage="No tasks for this day"
                  togglingTaskId={togglingTaskId}
                  resourceTaskId={resourceTaskId}
                  onToggleResources={setResourceTaskId}
                />
              </div>
            </div>
          )}

          {/* Pomodoro Timer – compact trigger */}
          <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-[var(--accent)]" />
                <h4 className="text-sm font-bold text-[var(--text-primary)]">Pomodoro Timer</h4>
              </div>
            </div>
            <p className="text-xs text-[var(--text-muted)] mb-4">Full-screen focus mode with customizable cycles.</p>
            <button
              onClick={() => setPomoOpen(true)}
              className="flex items-center gap-2 w-full justify-center rounded-lg px-4 py-2.5 text-sm font-semibold text-black transition active:scale-95"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              <Maximize2 size={14} />
              Enter Focus Mode
            </button>
          </div>

          {/* Fullscreen Pomodoro Modal */}
          <PomodoroModal
            open={pomoOpen}
            onClose={() => setPomoOpen(false)}
            currentTask={(() => {
              const tasks_ = activePlan.mode === "finish_today" ? planTasks : selectedDayTasks;
              const pending = tasks_.find((t) => t.status === "pending");
              return pending?.title || pending?.topic || null;
            })()}
            onSessionComplete={() => {
              const tasks_ = activePlan.mode === "finish_today" ? planTasks : selectedDayTasks;
              const pending = tasks_.find((t) => t.status === "pending");
              if (pending) toggleTask(pending._id);
            }}
          />
        </div>
      )}

      {/* ── Existing plans list ──────────────────── */}
      {!activePlan && plans.length > 0 && (
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-5">
          <h3 className="mb-3 text-sm font-bold text-[var(--text-primary)]">Your Plans</h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((p) => {
              const id = p._id || p.id;
              const stats = p.taskStats || {};
              const pct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
              return (
                <div
                  key={id}
                  className="group relative rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-3 text-left transition hover:border-[var(--accent)] cursor-pointer"
                  onClick={() => viewPlan(id)}
                >
                  <button
                    onClick={(e) => handleDeletePlan(id, e)}
                    className="absolute top-2 right-2 rounded p-1 text-[var(--text-faint)] opacity-0 transition hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
                    title="Delete plan"
                  >
                    <Trash2 size={13} />
                  </button>
                  <p className="truncate text-sm font-medium text-[var(--text-primary)] pr-6">{p.title}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-[10px] uppercase text-[var(--text-faint)]">{p.mode?.replace("_", " ")}</span>
                    {stats.total > 0 && <span className="text-[10px] text-[var(--text-muted)]">{pct}%</span>}
                  </div>
                  {stats.total > 0 && (
                    <div className="mt-1.5 h-1 w-full rounded-full bg-[var(--bg-hover)] overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: 'var(--accent)' }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Intensity Label ─────────────────────────────── */
function intensityLabel(totalMins) {
  if (totalMins < 60) return { text: "Light", color: "text-green-400", bg: "bg-green-400/10" };
  if (totalMins <= 120) return { text: "Balanced", color: "text-blue-400", bg: "bg-blue-400/10" };
  return { text: "Heavy", color: "text-orange-400", bg: "bg-orange-400/10" };
}

const DIFF_PRIORITY = { hard: 3, medium: 2, easy: 1 };
const DIFF_COLORS = {
  hard: "text-red-400 bg-red-400/10 border-red-400/20",
  medium: "text-[var(--accent)] bg-[var(--accent)]/10 border-[var(--accent)]/20",
  easy: "text-green-400 bg-green-400/10 border-green-400/20",
};
const DIFF_DOT = {
  hard: "bg-red-400",
  medium: "bg-[var(--accent)]",
  easy: "bg-green-400",
};

/* ── Day Card Component ─────────────────────────── */
function DayCard({ label, dateStr, dayNumber, tasks, isToday, onToggle, onExpand, expandedTask, expandingId, togglingTaskId, resourceTaskId, onToggleResources }) {
  const totalMins = tasks.reduce((s, t) => s + (t.allocatedMinutes || 0), 0);
  const doneCount = tasks.filter((t) => t.status === "done").length;
  const intensity = intensityLabel(totalMins);

  // Difficulty breakdown for header
  const hardCount = tasks.filter((t) => (t.difficulty || "medium") === "hard").length;
  const medCount = tasks.filter((t) => (t.difficulty || "medium") === "medium").length;
  const easyCount = tasks.filter((t) => (t.difficulty || "medium") === "easy").length;

  // Sort: hard first, then medium, then easy
  const sortedTasks = [...tasks].sort(
    (a, b) => (DIFF_PRIORITY[b.difficulty || "medium"] || 2) - (DIFF_PRIORITY[a.difficulty || "medium"] || 2)
  );

  const dateLabel = label || (dateStr
    ? new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })
    : "Today");

  const dayTitle = dayNumber && !label
    ? `Day ${dayNumber} — ${dateLabel}`
    : (isToday && dateStr ? `Today — ${dateLabel}` : dateLabel);

  const pct = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0;

  return (
    <div className={`rounded-xl border bg-[var(--bg-surface)] overflow-hidden shadow-sm transition-shadow hover:shadow-md ${
      isToday ? "border-[var(--accent)]/40 ring-1 ring-[var(--accent)]/10" : "border-[var(--border-color)]"
    }`}>
      {/* Day header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays size={14} className={isToday ? "text-[var(--accent)]" : "text-[var(--text-faint)]"} />
            <h4 className={`text-sm font-bold ${isToday ? "text-[var(--accent)]" : "text-[var(--text-primary)]"}`}>
              {dayTitle}
            </h4>
          </div>
          {isToday && (
            <span className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider" style={{ backgroundColor: "var(--accent)", color: "#000" }}>
              Today
            </span>
          )}
        </div>
        <div className="flex items-center gap-2.5">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${intensity.bg} ${intensity.color}`}>
            {intensity.text}
          </span>
          {hardCount > 0 && <span className="text-[9px] font-semibold text-red-400">{hardCount}H</span>}
          {medCount > 0 && <span className="text-[9px] font-semibold text-[var(--accent)]">{medCount}M</span>}
          {easyCount > 0 && <span className="text-[9px] font-semibold text-green-400">{easyCount}E</span>}
          <span className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
            <Clock size={10} />
            {formatMins(totalMins)}
          </span>
          <span className="text-[10px] text-[var(--text-faint)]">
            {doneCount}/{tasks.length}
          </span>
        </div>
      </div>

      {/* Day progress bar */}
      {tasks.length > 0 && (
        <div className="h-1 bg-[var(--bg-hover)]">
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${pct}%`, backgroundColor: pct === 100 ? "#4ade80" : "var(--accent)" }}
          />
        </div>
      )}

      {/* Task list */}
      {sortedTasks.length === 0 ? (
        <div className="flex items-center justify-center py-8">
          <p className="text-xs text-[var(--text-faint)]">No tasks for this day</p>
        </div>
      ) : (
        <ul className="divide-y divide-[var(--border-color)]">
          {sortedTasks.map((task) => {
            const tid = task._id;
            const isDone = task.status === "done";
            const isExpanded = expandedTask === tid;
            const hasSubs = task.subtasks?.length > 0;
            const matTitle = task.material?.title || "";
            const diff = task.difficulty || "medium";
            const diffClass = DIFF_COLORS[diff] || DIFF_COLORS.medium;
            const diffDot = DIFF_DOT[diff] || DIFF_DOT.medium;

            return (
              <li key={tid}>
                <div className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-[var(--bg-hover)]/50">
                  <button onClick={() => onToggle(tid)} disabled={togglingTaskId === tid} className="shrink-0 mt-0.5 transition disabled:opacity-50">
                    {togglingTaskId === tid ? (
                      <Loader2 size={18} className="animate-spin text-[var(--accent)]" />
                    ) : isDone ? (
                      <CheckCircle2 size={18} className="text-green-400" />
                    ) : (
                      <Circle size={18} className="text-[var(--text-faint)] hover:text-[var(--accent)] transition" />
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    {/* Topic name — main display */}
                    <span className={`block text-sm font-medium leading-snug ${isDone ? "text-[var(--text-faint)] line-through" : "text-[var(--text-primary)]"}`}>
                      {task.topic}
                    </span>
                    {/* Material name + difficulty + time — secondary row */}
                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                      {matTitle && (
                        <span className="text-[10px] text-[var(--text-muted)] truncate max-w-[180px]">
                          from <span className="text-[var(--accent)] opacity-80">{matTitle}</span>
                        </span>
                      )}
                      <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-px text-[9px] font-bold uppercase tracking-wide ${diffClass}`}>
                        <span className={`inline-block h-1.5 w-1.5 rounded-full ${diffDot}`} />
                        {diff}
                      </span>
                      <span className="flex items-center gap-0.5 text-[10px] text-[var(--text-faint)]">
                        ⏱ {formatMins(task.allocatedMinutes)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => onExpand(task)}
                    disabled={expandingId === tid}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium text-[var(--text-muted)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--accent)] shrink-0"
                  >
                    {expandingId === tid ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : hasSubs ? (
                      <ChevronDown size={12} className={`transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                    ) : (
                      <Zap size={12} />
                    )}
                    {hasSubs ? (isExpanded ? "Hide" : `${task.subtasks.length}`) : "Split"}
                  </button>
                  <button
                    onClick={() => onToggleResources?.(resourceTaskId === tid ? null : tid)}
                    className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium transition shrink-0 ${
                      resourceTaskId === tid
                        ? "bg-[var(--accent)]/15 text-[var(--accent)]"
                        : "text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--accent)]"
                    }`}
                  >
                    <ExternalLink size={11} />
                    Resources
                  </button>
                </div>
                {resourceTaskId === tid && (
                  <div className="border-t border-[var(--border-color)] bg-[var(--bg-hover)]/30 px-4 py-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-faint)] mb-2">Recommended Resources</p>
                    <div className="flex flex-wrap gap-1.5">
                      {getResourcesForTopic(task.topic).map((r) => (
                        <a
                          key={r.title}
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-color)] px-2.5 py-1.5 text-[11px] font-medium ${r.color} ${r.bg} transition hover:opacity-80 hover:scale-[1.02]`}
                        >
                          <span>{r.icon}</span>
                          {r.title}
                          <ExternalLink size={9} className="opacity-50" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                {isExpanded && hasSubs && (
                  <div className="border-t border-[var(--border-color)] bg-black/5 px-4 py-2 space-y-1">
                    {task.subtasks.map((sub, si) => (
                      <div key={si} className="flex items-center gap-2.5 py-1">
                        <Circle size={12} className="shrink-0 text-[var(--text-faint)]" />
                        <span className="text-xs text-[var(--text-muted)]">{sub.text || sub}</span>
                      </div>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ── Task List Component ────────────────────────── */
function TaskList({ tasks, onToggle, onExpand, expandedTask, expandingId, emptyMessage, togglingTaskId, resourceTaskId, onToggleResources }) {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--bg-surface)] py-16 text-center">
        <BookOpen size={32} className="text-[var(--text-faint)] mb-3" />
        <p className="text-sm font-medium text-[var(--text-muted)]">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {tasks.map((task) => {
        const tid = task._id;
        const isDone = task.status === "done";
        const isExpanded = expandedTask === tid;
        const hasSubs = task.subtasks?.length > 0;
        const matTitle = task.material?.title || "";
        const diff = task.difficulty || "medium";
        const diffClass = DIFF_COLORS[diff] || DIFF_COLORS.medium;
        const diffDot = DIFF_DOT[diff] || DIFF_DOT.medium;

        return (
          <li key={tid} className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] overflow-hidden shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-[var(--bg-hover)]/50">
              <button onClick={() => onToggle(tid)} disabled={togglingTaskId === tid} className="shrink-0 mt-0.5 transition disabled:opacity-50">
                {togglingTaskId === tid ? (
                  <Loader2 size={18} className="animate-spin text-[var(--accent)]" />
                ) : isDone ? (
                  <CheckCircle2 size={18} className="text-green-400" />
                ) : (
                  <Circle size={18} className="text-[var(--text-faint)] hover:text-[var(--accent)] transition" />
                )}
              </button>
              <div className="min-w-0 flex-1">
                {/* Topic name — primary */}
                <span className={`block text-sm font-medium leading-snug ${isDone ? "text-[var(--text-faint)] line-through" : "text-[var(--text-primary)]"}`}>
                  {task.topic}
                </span>
                {/* Material + difficulty + time — secondary row */}
                <div className="mt-1 flex items-center gap-2 flex-wrap">
                  {matTitle && (
                    <span className="text-[10px] text-[var(--text-muted)] truncate max-w-[180px]">
                      from <span className="text-[var(--accent)] opacity-80">{matTitle}</span>
                    </span>
                  )}
                  <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-px text-[9px] font-bold uppercase tracking-wide ${diffClass}`}>
                    <span className={`inline-block h-1.5 w-1.5 rounded-full ${diffDot}`} />
                    {diff}
                  </span>
                  <span className="flex items-center gap-0.5 text-[10px] text-[var(--text-faint)]">
                    ⏱ {formatMins(task.allocatedMinutes)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => onExpand(task)}
                disabled={expandingId === tid}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium text-[var(--text-muted)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--accent)] shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {expandingId === tid ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : hasSubs ? (
                  <ChevronDown size={12} className={`transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                ) : (
                  <Zap size={12} />
                )}
                {hasSubs ? (isExpanded ? "Hide" : `${task.subtasks.length} sub`) : "Break down"}
              </button>
              <button
                onClick={() => onToggleResources?.(resourceTaskId === tid ? null : tid)}
                className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium transition shrink-0 ${
                  resourceTaskId === tid
                    ? "bg-[var(--accent)]/15 text-[var(--accent)]"
                    : "text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--accent)]"
                }`}
              >
                <ExternalLink size={11} />
                Resources
              </button>
            </div>
            {resourceTaskId === tid && (
              <div className="border-t border-[var(--border-color)] bg-[var(--bg-hover)]/30 px-4 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-faint)] mb-2">Recommended Resources</p>
                <div className="flex flex-wrap gap-1.5">
                  {getResourcesForTopic(task.topic).map((r) => (
                    <a
                      key={r.title}
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-color)] px-2.5 py-1.5 text-[11px] font-medium ${r.color} ${r.bg} transition hover:opacity-80 hover:scale-[1.02]`}
                    >
                      <span>{r.icon}</span>
                      {r.title}
                      <ExternalLink size={9} className="opacity-50" />
                    </a>
                  ))}
                </div>
              </div>
            )}
            {isExpanded && hasSubs && (
              <div className="border-t border-[var(--border-color)] bg-black/10 px-4 py-2 space-y-1">
                {task.subtasks.map((sub, si) => (
                  <div key={si} className="flex items-center gap-2.5 py-1">
                    <Circle size={14} className="shrink-0 text-[var(--text-faint)]" />
                    <span className="text-xs text-[var(--text-muted)]">{sub.text || sub}</span>
                  </div>
                ))}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/* ── Stat Card ──────────────────────────────────── */
function StatCard({ icon: Icon, color, bg, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4">
      <div className={`rounded-lg p-2 ${bg}`}>
        <Icon size={16} className={color} />
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-faint)]">{label}</p>
        <p className="text-sm font-bold text-[var(--text-primary)]">{value}</p>
      </div>
    </div>
  );
}


