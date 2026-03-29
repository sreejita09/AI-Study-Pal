import { useState, useRef, useEffect } from "react";
import {
  Plus, FileText, BookOpen, ChevronLeft, ChevronRight, ChevronDown,
  LogOut, AlignLeft, StickyNote, HelpCircle, Search, X, Trash2, Pencil, Check,
  File, FileType, Presentation, Clock, Layers, Sun, Moon, Palette, RefreshCw
} from "lucide-react";
import { useTheme, ACCENT_COLORS } from "../../context/ThemeContext";

const TYPE_ICONS = { summary: AlignLeft, notes: StickyNote, quiz: HelpCircle };
const TYPE_COLORS = { summary: "text-blue-400", notes: "text-purple-400", quiz: "text-green-400" };
const TYPE_LABELS = { summary: "Summary", notes: "Notes", quiz: "Quiz" };

const FILE_TYPE_ICONS = { pdf: FileText, doc: File, ppt: Presentation, txt: FileType, paste: FileType };
const FILE_TYPE_COLORS = { pdf: "text-red-400", doc: "text-blue-400", ppt: "text-orange-400", txt: "text-zinc-400", paste: "text-purple-400" };

function timeAgo(ts) {
  if (!ts) return "";
  try {
    const diff = Date.now() - new Date(ts).getTime();
    if (diff < 0 || isNaN(diff)) return ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return ts;
  } catch {
    return ts;
  }
}

function formatMins(mins) {
  if (!mins) return "";
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export default function DashboardSidebar({
  sessions = [],
  studyPlans = [],
  materials = [],
  selectedMaterialIds = [],
  onToggleMaterial,
  onMaterialQuickAction,
  onDeleteMaterial,
  onReprocessMaterial,
  activeSessionId,
  activeTab = "materials",
  onTabChange,
  onNewStudy,
  onSelectSession,
  onSelectHistory,
  onDeleteHistoryItem,
  onDeleteSession,
  onRenameSession,
  onClearHistory,
  onLogout,
  collapsed,
  onToggleCollapse,
  history = [],
  plans = [],
  onSelectPlan,
  onDeletePlan,
  activePlanId,
}) {
  const tab = activeTab;
  const setTab = (t) => onTabChange?.(t);

  const { theme, accentColor, toggleTheme, setAccentColor } = useTheme();

  const [searchQuery, setSearchQuery] = useState("");
  const [materialsOpen, setMaterialsOpen] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [plansOpen, setPlansOpen] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteMaterialTarget, setDeleteMaterialTarget] = useState(null);
  const [deleteHistoryTarget, setDeleteHistoryTarget] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [themePickerOpen, setThemePickerOpen] = useState(false);
  const renameRef = useRef(null);

  useEffect(() => {
    if (editingId && renameRef.current) {
      renameRef.current.focus();
      renameRef.current.select();
    }
  }, [editingId]);

  const startRename = (e, item) => {
    e.stopPropagation();
    setEditingId(item.id || item._id);
    setEditValue(item.title || "");
  };

  const commitRename = (id) => {
    const trimmed = editValue.trim();
    if (trimmed && onRenameSession) {
      onRenameSession(id, trimmed);
    }
    setEditingId(null);
  };

  // Group history by sessionId
  const sessionHistory = {};
  history.forEach((h) => {
    if (h.sessionId) {
      if (!sessionHistory[h.sessionId]) sessionHistory[h.sessionId] = [];
      sessionHistory[h.sessionId].push(h);
    }
  });

  // Collapsed sidebar
  if (collapsed) {
    return (
      <aside className="flex h-screen w-16 flex-col items-center border-r bg-[var(--bg-panel)] border-[var(--border-color)] py-4">
        <button
          onClick={onToggleCollapse}
          className="mb-6 rounded-lg bg-[var(--bg-surface)] p-2 text-[var(--text-muted)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
        >
          <ChevronRight size={18} />
        </button>
        <button
          onClick={onNewStudy}
          className="mb-4 rounded-lg p-2.5 text-black transition-all"
          style={{ backgroundColor: "var(--accent)" }}
        >
          <Plus size={18} />
        </button>
        <div className="mt-auto flex flex-col items-center gap-2">
          <button onClick={toggleTheme} className="rounded-lg p-2 text-[var(--text-muted)] transition hover:text-[var(--text-primary)]">
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button onClick={onLogout} className="rounded-lg p-2 text-[var(--text-muted)] transition hover:text-red-400">
            <LogOut size={18} />
          </button>
        </div>
      </aside>
    );
  }

  const q = searchQuery.toLowerCase().trim();

  const filteredSessions = q
    ? sessions.filter((s) => s.title?.toLowerCase().includes(q))
    : sessions;

  const filteredMaterials = q
    ? materials.filter((m) => m.title?.toLowerCase().includes(q) || m.subject?.toLowerCase().includes(q))
    : materials;

  const filteredPlans = q
    ? (plans || []).filter((p) => p.title?.toLowerCase().includes(q))
    : (plans || []);

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-[var(--bg-panel)] border-[var(--border-color)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border-color)] px-4 py-4">
        <h2 className="font-display text-lg font-bold tracking-wide text-[var(--text-primary)]">AI Study Pal</h2>
        <button
          onClick={onToggleCollapse}
          className="rounded-lg p-1.5 text-[var(--text-muted)] transition hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      {/* New Study Button */}
      <div className="px-3 mt-4 mb-3">
        <button
          onClick={onNewStudy}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold text-black transition-all active:scale-[0.98]"
          style={{ backgroundColor: "var(--accent)" }}
        >
          <Plus size={14} />
          New Study
        </button>
      </div>

      {/* Search Bar */}
      <div className="px-3 mb-3">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search materials & plans..."
            className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] py-2 pl-8 pr-8 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-faint)] outline-none transition focus:bg-[var(--bg-card)]"
            style={{ borderColor: searchQuery ? "var(--accent-border)" : undefined }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--border-color)] px-3">
        <button
          onClick={() => setTab("materials")}
          className={`flex-1 border-b-2 px-3 py-2.5 text-xs font-semibold uppercase tracking-wide transition ${
            tab === "materials"
              ? "text-[var(--text-primary)]"
              : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          }`}
          style={tab === "materials" ? { borderBottomColor: "var(--accent)" } : {}}
        >
          Materials
        </button>
        <button
          onClick={() => setTab("plans")}
          className={`flex-1 border-b-2 px-3 py-2.5 text-xs font-semibold uppercase tracking-wide transition ${
            tab === "plans"
              ? "text-[var(--text-primary)]"
              : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          }`}
          style={tab === "plans" ? { borderBottomColor: "var(--accent)" } : {}}
        >
          Plans
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {tab === "materials" ? (
          <>
            {/* MATERIALS Section — uploaded files with multi-select */}
            <SectionHeader
              label="MATERIALS"
              open={materialsOpen}
              onToggle={() => setMaterialsOpen((o) => !o)}
              count={filteredMaterials.length}
            />
            {materialsOpen && (
              <ul className="mb-2 space-y-0.5">
                {filteredMaterials.length === 0 ? (
                  <div className="flex flex-col items-center px-3 py-6 text-center">
                    <FileText size={20} className="mb-2 text-[var(--text-faint)]" />
                    <p className="text-xs font-medium text-[var(--text-muted)]">
                      {q ? "No matching materials" : "No materials uploaded yet"}
                    </p>
                    {!q && <p className="mt-1 text-[10px] text-[var(--text-faint)]">Upload a file to get started</p>}
                  </div>
                ) : (
                  filteredMaterials.map((mat) => {
                    const matId = mat._id || mat.id;
                    const isSelected = selectedMaterialIds.includes(matId);
                    const FtIcon = FILE_TYPE_ICONS[mat.fileType] || FileText;
                    const ftColor = FILE_TYPE_COLORS[mat.fileType] || "text-zinc-500";

                    return (
                      <li key={matId}>
                        <div
                          className={`group relative flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left transition-all duration-150 cursor-pointer border ${
                            isSelected
                              ? "border-transparent bg-[var(--bg-surface)]"
                              : "border-transparent hover:bg-[var(--bg-surface)]"
                          }`}
                          style={isSelected ? { borderColor: "var(--accent-border)", backgroundColor: "var(--accent-faint)" } : {}}
                        >
                          {/* Checkbox for multi-select */}
                          <button
                            onClick={(e) => { e.stopPropagation(); onToggleMaterial?.(matId); }}
                            className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
                              isSelected
                                ? "border-transparent"
                                : "border-zinc-600 bg-transparent hover:border-zinc-400"
                            }`}
                            style={isSelected ? { backgroundColor: "var(--accent)", borderColor: "var(--accent)" } : {}}
                          >
                            {isSelected && <Check size={10} className="text-black" strokeWidth={3} />}
                          </button>

                          {/* Hover delete icon — top-right corner */}
                          {onDeleteMaterial && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setDeleteMaterialTarget(mat); }}
                              className="absolute right-1.5 top-1.5 hidden rounded p-0.5 text-[var(--text-faint)] transition hover:bg-red-500/20 hover:text-red-400 group-hover:block"
                              title="Delete material"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}

                          {/* Material info */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <FtIcon size={12} className={`shrink-0 ${ftColor}`} />
                              <p className="truncate text-sm font-medium text-[var(--text-primary)]">{mat.title}</p>
                            </div>
                            <div className="mt-0.5 flex items-center gap-2">
                              {mat.subject && (
                                <span
                                  className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                                  style={{ color: "var(--accent)", backgroundColor: "var(--accent-dim)" }}
                                >
                                  {mat.subject}
                                </span>
                              )}
                              <span className="text-[10px] text-[var(--text-faint)] uppercase">{mat.fileType}</span>
                              {mat.totalEstimatedMinutes > 0 && (
                                <span className="flex items-center gap-0.5 text-[10px] text-[var(--text-faint)]">
                                  <Clock size={8} />
                                  {formatMins(mat.totalEstimatedMinutes)}
                                </span>
                              )}
                            </div>
                            {mat.extractedTopics?.length > 0 && (
                              <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] text-[var(--text-faint)]">
                                  {mat.extractedTopics.length} topic{mat.extractedTopics.length !== 1 ? "s" : ""}
                                </span>
                                {(() => {
                                  const counts = { easy: 0, medium: 0, hard: 0 };
                                  mat.extractedTopics.forEach((t) => { if (counts[t.difficulty] !== undefined) counts[t.difficulty]++; });
                                  return (
                                    <>
                                      {counts.easy > 0 && <span className="rounded px-1 py-0.5 text-[9px] font-semibold bg-green-500/10 text-green-400">{counts.easy}E</span>}
                                      {counts.medium > 0 && <span className="rounded px-1 py-0.5 text-[9px] font-semibold bg-[var(--accent-dim)] text-[var(--accent)]">{counts.medium}M</span>}
                                      {counts.hard > 0 && <span className="rounded px-1 py-0.5 text-[9px] font-semibold bg-red-500/10 text-red-400">{counts.hard}H</span>}
                                    </>
                                  );
                                })()}
                              </div>
                            )}
                            {/* Quick action buttons */}
                            {onMaterialQuickAction && (
                              <div className="mt-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={(e) => { e.stopPropagation(); onMaterialQuickAction(matId, "summary"); }}
                                  className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-medium text-[var(--text-muted)] bg-[var(--bg-hover)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)] transition"
                                  title="Generate Summary"
                                >
                                  <AlignLeft size={9} /> Sum
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); onMaterialQuickAction(matId, "notes"); }}
                                  className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-medium text-[var(--text-muted)] bg-[var(--bg-hover)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)] transition"
                                  title="Generate Notes"
                                >
                                  <StickyNote size={9} /> Notes
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); onMaterialQuickAction(matId, "flashcards"); }}
                                  className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-medium text-[var(--text-muted)] bg-[var(--bg-hover)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)] transition"
                                  title="Generate Flashcards"
                                >
                                  <Layers size={9} /> Cards
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); onMaterialQuickAction(matId, "quiz"); }}
                                  className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-medium text-[var(--text-muted)] bg-[var(--bg-hover)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)] transition"
                                  title="Generate Quiz"
                                >
                                  <HelpCircle size={9} /> Quiz
                                </button>
                                {onReprocessMaterial && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); onReprocessMaterial(matId); }}
                                    className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-medium text-[var(--text-muted)] bg-[var(--bg-hover)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)] transition"
                                    title="Re-extract topics"
                                  >
                                    <RefreshCw size={9} /> Redo
                                  </button>
                                )}
                                {onDeleteMaterial && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setDeleteMaterialTarget(mat); }}
                                    className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-medium text-red-400 bg-red-400/10 hover:bg-red-400/20 transition"
                                    title="Delete material"
                                  >
                                    <Trash2 size={9} /> Del
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })
                )}
              </ul>
            )}

            {/* HISTORY Section */}
            <SectionHeader
              label="HISTORY"
              open={historyOpen}
              onToggle={() => setHistoryOpen((o) => !o)}
              count={history.length}
              action={history.length > 0 && onClearHistory ? (
                <button
                  onClick={(e) => { e.stopPropagation(); if (window.confirm("Clear all generation history?")) onClearHistory(); }}
                  className="ml-2 shrink-0 rounded px-1.5 py-0.5 text-[9px] font-medium text-[var(--text-faint)] hover:text-red-400 hover:bg-red-400/10 transition"
                  title="Clear history"
                >
                  Clear
                </button>
              ) : null}
            />
            {historyOpen && (
              <ul className="mb-2 space-y-0.5">
                {history.length === 0 ? (
                  <div className="flex flex-col items-center px-3 py-6 text-center">
                    <Clock size={20} className="mb-2 text-[var(--text-faint)]" />
                    <p className="text-xs font-medium text-[var(--text-muted)]">
                      {q ? "No matching history" : "No generations yet"}
                    </p>
                    {!q && <p className="mt-1 text-[10px] text-[var(--text-faint)]">Generate summaries, notes, or quizzes to see them here</p>}
                  </div>
                ) : (
                  history.slice(0, 20).map((h, i) => {
                    const Icon = TYPE_ICONS[h.type] || FileText;
                    const color = TYPE_COLORS[h.type] || "text-zinc-400";
                    const session = sessions.find((s) => s.id === h.sessionId);
                    if (q && !(h.type?.toLowerCase().includes(q) || TYPE_LABELS[h.type]?.toLowerCase().includes(q) || session?.title?.toLowerCase().includes(q))) {
                      return null;
                    }
                    return (
                      <li key={i} className="group relative">
                        <button
                          onClick={() => onSelectHistory?.(h)}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 pr-8 text-left transition-all duration-150 border border-transparent text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
                        >
                          <Icon size={14} className={`shrink-0 ${color}`} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {TYPE_LABELS[h.type] || h.type}
                            </p>
                            <p className="text-[11px] text-[var(--text-faint)]">
                              {session?.title ? `${session.title} · ` : ""}{timeAgo(h.timestamp)}
                            </p>
                          </div>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteHistoryTarget(h); }}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 opacity-0 group-hover:opacity-60 hover:!opacity-100 text-[var(--text-faint)] hover:text-red-400 hover:bg-red-400/10 transition-all"
                          title="Delete this item"
                        >
                          <Trash2 size={13} />
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            )}
          </>
        ) : (
          <>
            {/* STUDY PLANS Section */}
            <SectionHeader
              label="STUDY PLANS"
              open={plansOpen}
              onToggle={() => setPlansOpen((o) => !o)}
              count={filteredPlans.length}
            />
            {plansOpen && (
              <ul className="mb-2 space-y-0.5">
                {filteredPlans.length === 0 ? (
                  <div className="flex flex-col items-center px-3 py-6 text-center">
                    <BookOpen size={20} className="mb-2 text-[var(--text-faint)]" />
                    <p className="text-xs font-medium text-[var(--text-muted)]">
                      {q ? "No matching plans" : "No study plans yet"}
                    </p>
                    {!q && <p className="mt-1 text-[10px] text-[var(--text-faint)]">Select materials and create your first smart study plan</p>}
                  </div>
                ) : (
                  filteredPlans.map((plan) => {
                    const id = plan._id || plan.id;
                    const isActive = activePlanId === id;
                    const stats = plan.taskStats || {};
                    const pct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
                    return (
                      <li key={id} className="group relative">
                        <button
                          onClick={() => onSelectPlan?.(id)}
                          className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 pr-8 text-left transition-all duration-150 border ${
                            isActive
                              ? "bg-[var(--bg-surface)] text-[var(--text-primary)]"
                              : "border-transparent text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
                          }`}
                          style={isActive ? { borderColor: "var(--accent)", boxShadow: "0 0 8px var(--accent-faint)" } : {}}
                        >
                          <BookOpen size={14} className="shrink-0" style={{ color: isActive ? "var(--accent)" : undefined }} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{plan.title}</p>
                            <div className="mt-0.5 flex items-center gap-2">
                              <span className="text-[10px] text-[var(--text-faint)] uppercase">{plan.mode?.replace("_", " ")}</span>
                              {stats.total > 0 && (
                                <span className="text-[10px] text-[var(--text-muted)]">{stats.done}/{stats.total} tasks</span>
                              )}
                            </div>
                            {stats.total > 0 && (
                              <div className="mt-1 h-1 w-full rounded-full bg-[var(--bg-hover)] overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{ width: `${pct}%`, backgroundColor: "var(--accent)" }}
                                />
                              </div>
                            )}
                          </div>
                        </button>
                        {onDeletePlan && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onDeletePlan(id); }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--text-faint)] opacity-0 transition hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
                            title="Delete plan"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </li>
                    );
                  })
                )}
              </ul>
            )}
          </>
        )}
      </div>

      {/* Sign Out + Theme Controls */}
      <div className="border-t border-[var(--border-color)] p-3 space-y-2">
        {/* Theme toggle row */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="flex flex-1 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-[var(--text-muted)] transition hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
          <button
            onClick={() => setThemePickerOpen((o) => !o)}
            className="flex items-center gap-1 rounded-lg px-2 py-2 text-xs text-[var(--text-muted)] transition hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
            title="Choose accent color"
          >
            <Palette size={14} />
          </button>
        </div>

        {/* Color picker */}
        {themePickerOpen && (
          <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] p-2">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Accent Color</p>
            <div className="grid grid-cols-5 gap-1.5">
              {ACCENT_COLORS.map(({ hex, label }) => (
                <button
                  key={hex}
                  onClick={() => setAccentColor(hex)}
                  title={label}
                  className="relative h-6 w-6 rounded-full transition-transform hover:scale-110 focus:outline-none"
                  style={{ backgroundColor: hex }}
                >
                  {accentColor === hex && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <Check size={12} className="text-black drop-shadow" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={() => window.location.href = '/profile'}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-[var(--text-muted)] transition hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
        >
          <Palette size={16} />
          Profile &amp; Settings
        </button>
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-[var(--text-muted)] transition hover:bg-[var(--bg-surface)] hover:text-red-400"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>

      {/* Delete Session Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Delete study session?</h3>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Are you sure you want to delete <span className="font-medium text-[var(--text-primary)]">"{deleteTarget.title}"</span>?
              This will remove the file and all related history.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-[var(--border-color)] px-4 py-2 text-sm text-[var(--text-muted)] transition hover:bg-[var(--bg-surface)]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteSession?.(deleteTarget.id || deleteTarget._id);
                  setDeleteTarget(null);
                }}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Material Confirmation Modal */}
      {deleteMaterialTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Delete this material?</h3>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Are you sure you want to delete <span className="font-medium text-[var(--text-primary)]">"{deleteMaterialTarget.title}"</span>?
              This will also remove related tasks from any existing plans.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setDeleteMaterialTarget(null)}
                className="rounded-lg border border-[var(--border-color)] px-4 py-2 text-sm text-[var(--text-muted)] transition hover:bg-[var(--bg-surface)]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteMaterial?.(deleteMaterialTarget._id || deleteMaterialTarget.id);
                  setDeleteMaterialTarget(null);
                }}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete History Item Confirmation Modal */}
      {deleteHistoryTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Delete this item?</h3>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              This will permanently remove the{" "}
              <span className="font-medium text-[var(--text-primary)]">
                {TYPE_LABELS[deleteHistoryTarget.type] || deleteHistoryTarget.type}
              </span>{" "}
              entry from your history.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setDeleteHistoryTarget(null)}
                className="rounded-lg border border-[var(--border-color)] px-4 py-2 text-sm text-[var(--text-muted)] transition hover:bg-[var(--bg-surface)]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteHistoryItem?.(deleteHistoryTarget);
                  setDeleteHistoryTarget(null);
                }}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

/* Collapsible section header */
function SectionHeader({ label, open, onToggle, count = 0, action }) {
  return (
    <div className="mt-3 mb-1.5 flex w-full items-center px-1">
      <button
        onClick={onToggle}
        className="flex flex-1 items-center justify-between group"
      >
        <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition">
          {label}
          {count > 0 && (
            <span className="ml-1.5 text-[var(--text-faint)]">{count}</span>
          )}
        </span>
        <ChevronDown
          size={12}
          className={`text-[var(--text-faint)] transition-transform duration-200 group-hover:text-[var(--text-muted)] ${
            open ? "rotate-0" : "-rotate-90"
          }`}
        />
      </button>
      {action}
    </div>
  );
}
