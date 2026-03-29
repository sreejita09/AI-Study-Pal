import { useRef } from "react";
import {
  FileText, AlignLeft, HelpCircle, Layers,
  BookOpen, Upload, StickyNote,
} from "lucide-react";
import WeakTopicsCard from "./WeakTopicsCard";
import ResumeStudyCard from "./ResumeStudyCard";
import AISuggestionCard from "./AISuggestionCard";

const QUICK_ACTIONS = [
  { label: "Summary",    icon: AlignLeft,   tab: "summary"    },
  { label: "Notes",      icon: StickyNote,  tab: "notes"      },
  { label: "Quiz",       icon: HelpCircle,  tab: "quiz"       },
  { label: "Flashcards", icon: Layers,      tab: "flashcards" },
];

export default function DashboardHome({ materials = [], onMaterialAction, onUpload, weakTopics = [], onTopicClick, onAddTopic, lastMaterial, onResumeStudy }) {
  const fileInputRef  = useRef(null);
  const recent        = materials[0];

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (file && onUpload) onUpload(file);
    e.target.value = "";
  };

  return (
    <div className="flex flex-1 flex-col gap-5">
      {/* ── Resume Study ─────────────────────── */}
      <ResumeStudyCard lastMaterial={lastMaterial} onResume={onResumeStudy} />

      {/* ── AI Suggestion ────────────────────── */}
      <AISuggestionCard
        weakTopics={weakTopics}
        lastMaterial={lastMaterial}
        onQuiz={onTopicClick}
        onResume={onResumeStudy}
      />

      {/* ── Recent Material ─────────────────── */}
      {recent ? (
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Continue where you left off
          </p>
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: "var(--accent-soft)" }}
            >
              <FileText size={18} style={{ color: "var(--accent)" }} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{recent.title}</p>
              {recent.subject && (
                <p className="text-xs text-[var(--text-muted)]">{recent.subject}</p>
              )}
              {recent.extractedTopics?.length > 0 && (
                <p className="text-[10px] text-[var(--text-faint)] mt-0.5">
                  {recent.extractedTopics.length} topic{recent.extractedTopics.length !== 1 ? "s" : ""} extracted
                </p>
              )}
            </div>
            <button
              onClick={() => onMaterialAction(recent._id || recent.id, "summary")}
              className="shrink-0 rounded-lg px-4 py-2 text-xs font-bold text-black transition hover:opacity-90 active:scale-95"
              style={{ backgroundColor: "var(--accent)" }}
            >
              Continue Study
            </button>
          </div>
        </div>
      ) : (
        /* No materials at all */
        <div className="rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--bg-surface)] p-10 text-center">
          <BookOpen size={28} className="mx-auto mb-3 text-[var(--text-faint)]" />
          <p className="text-sm font-semibold text-[var(--text-primary)]">No materials yet</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Upload a file to unlock AI-powered summaries, notes, quizzes, and flashcards
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.doc,.docx,.ppt,.pptx"
            className="hidden"
            onChange={handleFile}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="mt-5 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold text-black transition hover:opacity-90 active:scale-95"
            style={{ backgroundColor: "var(--accent)" }}
          >
            <Upload size={15} />
            Upload File
          </button>
        </div>
      )}

      {/* ── Quick Actions ────────────────────── */}
      {recent && (
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Quick Actions
          </p>
          <div className="grid grid-cols-4 gap-3">
            {QUICK_ACTIONS.map(({ label, icon: Icon, tab }) => (
              <button
                key={tab}
                onClick={() => onMaterialAction(recent._id || recent.id, tab)}
                className="flex flex-col items-center gap-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 text-[var(--text-muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] hover:scale-[1.02] active:scale-[0.98]"
              >
                <Icon size={20} />
                <span className="text-center text-xs font-semibold">{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Weak Topics ──────────────────────── */}
      <WeakTopicsCard topics={weakTopics} onTopicClick={onTopicClick} onAddTopic={onAddTopic} />
    </div>
  );
}
