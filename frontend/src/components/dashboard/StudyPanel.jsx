import { useState, useEffect } from "react";
import {
  X, AlignLeft, StickyNote, Layers, HelpCircle,
  Loader2, RefreshCw, ChevronLeft, ChevronRight, Check, Copy, Play, FileDown, Presentation, PackageOpen
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../../lib/api";
import ReactMarkdown from "react-markdown";
import { exportDocx, markdownToStructured } from "../../utils/export/exportDocx";
import { exportPpt } from "../../utils/export/exportPpt";
import { exportZip } from "../../utils/export/exportZip";

const TABS = [
  { key: "summary", label: "Summary", icon: AlignLeft, color: "text-blue-400" },
  { key: "notes", label: "Notes", icon: StickyNote, color: "text-purple-400" },
  { key: "flashcards", label: "Flashcards", icon: Layers, color: "text-orange-400" },
  { key: "quiz", label: "Quiz", icon: HelpCircle, color: "text-green-400" },
];

export default function StudyPanel({ material, initialTab = "summary", onClose, onStartQuiz, onTabChange }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [content, setContent] = useState({});
  const [loading, setLoading] = useState("");
  const [downloadingAll, setDownloadingAll] = useState(false);

  // Sync initial tab when opened from quick action
  useEffect(() => { setActiveTab(initialTab); }, [initialTab]);

  // Load cached content on open
  useEffect(() => {
    if (!material?._id) return;
    const fetchCached = async () => {
      try {
        const { data } = await api.get(`/study/content/${material._id}`);
        setContent(data.content || {});
      } catch { /* no cached content */ }
    };
    fetchCached();
  }, [material?._id]);

  const generate = async (type, force = false) => {
    if (loading) return;
    if (!force && content[type]) { setActiveTab(type); return; }

    setLoading(type);
    setActiveTab(type);

    try {
      if (force) {
        await api.delete(`/study/content/${material._id}/${type}`);
      }
      const { data } = await api.post("/study/generate", {
        materialId: material._id,
        type,
      });
      setContent((prev) => ({ ...prev, [type]: data.content }));
    } catch (err) {
      toast.error(err.response?.data?.error || `Failed to generate ${type}`);
    } finally {
      setLoading("");
    }
  };

  const handleTabClick = (key) => {
    setActiveTab(key);
    onTabChange?.(key);
    if (!content[key]) generate(key);
  };

  // Auto-generate when switching to a tab with no content
  useEffect(() => {
    if (!material?._id || !activeTab || loading) return;
    if (!content[activeTab]) generate(activeTab);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const currentContent = content[activeTab];

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l border-[var(--border-color)] bg-[var(--bg-base)] shadow-2xl">
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[-1] bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border-color)] px-5 py-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-[var(--text-primary)]">{material?.title}</p>
          {material?.subject && (
            <span className="text-[10px] font-semibold text-[var(--accent)]">{material.subject}</span>
          )}
        </div>
        <button onClick={onClose} className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition">
          <X size={18} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--border-color)]">
        {TABS.map(({ key, label, icon: Icon, color }) => (
          <button
            key={key}
            onClick={() => handleTabClick(key)}
            className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-semibold transition ${
              activeTab === key
                ? "border-b-2 border-[var(--accent)] text-[var(--accent)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Icon size={14} className={activeTab === key ? "text-[var(--accent)]" : color} />
            {label}
            {content[key] && <Check size={10} className="text-green-400" />}
          </button>
        ))}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto p-5">
        {loading === activeTab ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-[var(--accent)] mb-3" />
            <p className="text-sm text-[var(--text-muted)]">Generating {activeTab}...</p>
          </div>
        ) : !currentContent ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-sm text-[var(--text-muted)] mb-4">No {activeTab} generated yet</p>
            <button
              onClick={() => generate(activeTab)}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-black"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              Generate {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            </button>
          </div>
        ) : activeTab === "flashcards" ? (
          <FlashcardViewer content={currentContent} />
        ) : activeTab === "quiz" ? (
          <QuizViewer content={currentContent} onStartQuiz={onStartQuiz} />
        ) : (
          <div className="prose prose-invert prose-sm max-w-none">
            <MarkdownContent content={currentContent} />
          </div>
        )}
      </div>

      {/* Footer actions */}
      {currentContent && (
        <div className="flex items-center gap-2 border-t border-[var(--border-color)] px-5 py-3 flex-wrap">
          <button
            onClick={() => generate(activeTab, true)}
            disabled={!!loading}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--bg-card)] px-3 py-2 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            Regenerate
          </button>
          <button
            onClick={() => {
              const text = typeof currentContent === "string" ? currentContent : JSON.stringify(currentContent);
              navigator.clipboard.writeText(text);
              toast.success("Copied!");
            }}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--bg-card)] px-3 py-2 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
          >
            <Copy size={12} />
            Copy
          </button>
          {(activeTab === "summary" || activeTab === "notes") && typeof currentContent === "string" && (
            <button
              disabled={!!loading}
              onClick={async () => {
                const label    = activeTab === "summary" ? "Summary" : "Notes";
                const docTitle = material?.title ? `${material.title} — ${label}` : label;
                const result   = await exportDocx(markdownToStructured(docTitle, currentContent));
                if (result) toast.success("Downloaded as Word!");
              }}
              className="flex items-center gap-1.5 rounded-lg bg-[var(--bg-card)] px-3 py-2 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition ml-auto"
            >
              <FileDown size={12} />
              Download Word
            </button>
          )}
          {activeTab === "flashcards" && currentContent && (
            <button
              disabled={!!loading}
              onClick={async () => {
                try {
                  const parsed = typeof currentContent === "string" ? JSON.parse(currentContent) : currentContent;
                  const cards  = Array.isArray(parsed) ? parsed : [];
                  if (!cards.length) { toast.error("No flashcards to export."); return; }
                  await exportPpt(cards);
                  toast.success("Exported as PowerPoint!");
                } catch {
                  toast.error("Failed to export PowerPoint.");
                }
              }}
              className="flex items-center gap-1.5 rounded-lg bg-[var(--bg-card)] px-3 py-2 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition ml-auto"
            >
              <Presentation size={12} />
              Export as PowerPoint
            </button>
          )}
          {/* ── Download All ───────────────────────────────── */}
          <button
            disabled={downloadingAll}
            onClick={async () => {
              setDownloadingAll(true);
              try {
                // Notes → structured sections
                const notesMarkdown = typeof content.notes === "string" ? content.notes
                  : typeof content.summary === "string" ? content.summary : null;
                const notes = notesMarkdown
                  ? markdownToStructured(material?.title || "Study Notes", notesMarkdown)
                  : null;

                // Flashcards → array
                let cards;
                if (content.flashcards) {
                  try {
                    const parsed = typeof content.flashcards === "string"
                      ? JSON.parse(content.flashcards) : content.flashcards;
                    cards = Array.isArray(parsed) ? parsed : undefined;
                  } catch { /* skip */ }
                }

                // Study plan → normalised rows
                let plan;
                try {
                  const { data: plansData } = await api.get("/plans");
                  const active = (plansData.plans || plansData || [])[0];
                  if (active?._id) {
                    const { data: planData } = await api.get(`/plans/${active._id}`);
                    const tasks = planData.tasks || [];
                    const allDates = [...new Set(tasks.map((t) => t.assignedDate).filter(Boolean).sort())];
                    const dateToDay = {};
                    allDates.forEach((d, i) => { dateToDay[d] = i + 1; });
                    plan = tasks.map((t) => ({
                      day:        t.assignedDate ? (dateToDay[t.assignedDate] ?? "") : "",
                      date:       t.assignedDate || "Unscheduled",
                      topic:      t.topic || "",
                      material:   t.material?.title || "",
                      time:       t.estimatedTime || "",
                      difficulty: t.difficulty || "medium",
                      status:     t.status || "pending",
                    }));
                  }
                } catch { /* no plan */ }

                await exportZip({ notes, plan, cards });
                toast.success("study_materials.zip downloaded!");
              } catch (err) {
                toast.error(err.message || "Failed to create ZIP.");
              } finally {
                setDownloadingAll(false);
              }
            }}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: "var(--accent)", color: "#000" }}
          >
            {downloadingAll ? <Loader2 size={12} className="animate-spin" /> : <PackageOpen size={12} />}
            {downloadingAll ? "Preparing…" : "Download All"}
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Markdown Renderer ─────────────────────── */
function MarkdownContent({ content }) {
  if (typeof content !== "string") return <pre className="text-xs text-[var(--text-muted)]">{JSON.stringify(content, null, 2)}</pre>;

  // Simple markdown renderer without external dependency
  const lines = content.split("\n");
  return (
    <div className="space-y-2">
      {lines.map((line, i) => {
        if (line.startsWith("## ")) return <h2 key={i} className="text-base font-bold text-[var(--text-primary)] mt-4">{line.slice(3)}</h2>;
        if (line.startsWith("### ")) return <h3 key={i} className="text-sm font-bold text-[var(--text-muted)] mt-3">{line.slice(4)}</h3>;
        if (line.startsWith("# ")) return <h1 key={i} className="text-lg font-bold text-[var(--text-primary)] mt-4">{line.slice(2)}</h1>;
        if (line.startsWith("> ")) return <blockquote key={i} className="border-l-2 border-[var(--accent)] pl-3 text-xs text-[var(--text-muted)] italic">{formatInline(line.slice(2))}</blockquote>;
        if (line.startsWith("- ") || line.startsWith("* ")) return <li key={i} className="ml-4 text-sm text-[var(--text-primary)] list-disc">{formatInline(line.slice(2))}</li>;
        if (line.match(/^\d+\.\s/)) return <li key={i} className="ml-4 text-sm text-[var(--text-primary)] list-decimal">{formatInline(line.replace(/^\d+\.\s/, ""))}</li>;
        if (line.trim() === "") return <div key={i} className="h-2" />;
        return <p key={i} className="text-sm text-[var(--text-primary)]">{formatInline(line)}</p>;
      })}
    </div>
  );
}

function formatInline(text) {
  // Bold
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="text-[var(--text-primary)] font-semibold">{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

/* ── Flashcard Viewer ──────────────────────── */
function FlashcardViewer({ content }) {
  const [cards, setCards] = useState([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    try {
      const parsed = typeof content === "string" ? JSON.parse(content) : content;
      setCards(Array.isArray(parsed) ? parsed : []);
    } catch {
      setCards([]);
    }
  }, [content]);

  if (cards.length === 0) return <p className="text-sm text-[var(--text-muted)]">No flashcards generated.</p>;

  const card = cards[idx];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-[var(--text-muted)]">{idx + 1} / {cards.length}</span>
        <span className="text-[10px] text-[var(--text-faint)]">Click card to flip</span>
      </div>

      <button
        onClick={() => setFlipped(!flipped)}
        className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-8 text-center transition-all duration-300 hover:border-[var(--accent)] min-h-[200px] flex items-center justify-center"
      >
        <p className={`text-sm ${flipped ? "text-[var(--accent)]" : "text-[var(--text-primary)]"}`}>
          {flipped ? card.back : card.front}
        </p>
      </button>

      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => { setIdx(Math.max(0, idx - 1)); setFlipped(false); }}
          disabled={idx === 0}
          className="rounded-lg border border-[var(--border-color)] p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="flex gap-1">
          {cards.map((_, i) => (
            <button
              key={i}
              onClick={() => { setIdx(i); setFlipped(false); }}
              className={`h-1.5 w-4 rounded-full transition ${i === idx ? "bg-[var(--accent)]" : "bg-[var(--border-color)]"}`}
            />
          ))}
        </div>
        <button
          onClick={() => { setIdx(Math.min(cards.length - 1, idx + 1)); setFlipped(false); }}
          disabled={idx === cards.length - 1}
          className="rounded-lg border border-[var(--border-color)] p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

/* ── Quiz Viewer ──────────────────────────── */
function QuizViewer({ content, onStartQuiz }) {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    try {
      const parsed = typeof content === "string" ? JSON.parse(content) : content;
      setQuestions(Array.isArray(parsed) ? parsed : []);
      setAnswers({});
      setShowResults(false);
    } catch {
      setQuestions([]);
    }
  }, [content]);

  if (questions.length === 0) return <p className="text-sm text-[var(--text-muted)]">No quiz generated.</p>;

  const score = Object.keys(answers).reduce((s, qi) => {
    const q = questions[qi];
    return s + (answers[qi] === q?.answer ? 1 : 0);
  }, 0);

  return (
    <div className="space-y-6">
      {/* Launch full-screen quiz button */}
      {onStartQuiz && (
        <button
          onClick={() => onStartQuiz(questions)}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-black transition hover:opacity-90 active:scale-[0.98]"
          style={{ backgroundColor: "var(--accent)" }}
        >
          <Play size={14} />
          Start Full Quiz
        </button>
      )}
      {questions.map((q, qi) => {
        const selected = answers[qi];
        const isCorrect = selected === q.answer;
        return (
          <div key={qi} className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4">
            <p className="text-sm font-medium text-[var(--text-primary)] mb-3">
              <span className="text-[var(--accent)] mr-1.5">{qi + 1}.</span>
              {q.question}
            </p>
            <div className="space-y-2">
              {(q.options || []).map((opt, oi) => {
                const isSelected = selected === opt;
                const isAnswer = q.answer === opt;
                let style = "border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] hover:border-[var(--accent)]";
                if (showResults) {
                  if (isAnswer) style = "border-green-500/50 bg-green-500/10 text-green-400";
                  else if (isSelected && !isCorrect) style = "border-red-500/50 bg-red-500/10 text-red-400";
                } else if (isSelected) {
                  style = "border-[var(--accent)] bg-[var(--bg-hover)] text-[var(--accent)]";
                }
                return (
                  <button
                    key={oi}
                    onClick={() => !showResults && setAnswers((p) => ({ ...p, [qi]: opt }))}
                    className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition ${style}`}
                  >
                    <span className="shrink-0 w-5 h-5 rounded-full border border-current flex items-center justify-center text-[10px]">
                      {String.fromCharCode(65 + oi)}
                    </span>
                    {opt}
                  </button>
                );
              })}
            </div>
            {showResults && selected && q.explanation && (
              <p className="mt-2 text-xs text-[var(--text-muted)]">
                <span className={isCorrect ? "text-green-400" : "text-red-400"}>
                  {isCorrect ? "✓ Correct" : "✗ Wrong"}
                </span>
                {" — "}{q.explanation}
              </p>
            )}
          </div>
        );
      })}

      <div className="flex items-center gap-3">
        {!showResults ? (
          <button
            onClick={() => setShowResults(true)}
            disabled={Object.keys(answers).length < questions.length}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            Check Answers
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-[var(--text-primary)]">
              Score: {score}/{questions.length}
            </span>
            <span className={`text-xs font-semibold ${score >= questions.length * 0.8 ? "text-green-400" : score >= questions.length * 0.5 ? "text-[var(--accent)]" : "text-red-400"}`}>
              {score >= questions.length * 0.8 ? "Excellent!" : score >= questions.length * 0.5 ? "Good effort" : "Needs review"}
            </span>
            <button
              onClick={() => { setAnswers({}); setShowResults(false); }}
              className="rounded-lg bg-[var(--bg-card)] px-3 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
