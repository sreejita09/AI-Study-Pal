import { AlignLeft, StickyNote, Layers, HelpCircle, BookOpen, Play } from "lucide-react";

const VIEW_META = {
  summary:    { label: "Summary",    icon: AlignLeft  },
  notes:      { label: "Notes",      icon: StickyNote },
  flashcards: { label: "Flashcards", icon: Layers     },
  quiz:       { label: "Quiz",       icon: HelpCircle },
};

/**
 * ResumeStudyCard
 *
 * Props:
 *   lastMaterial  {{ id, title, subject?, lastView, lastAccessed }} | null
 *   onResume      (id: string, view: string) => void
 *
 * Hidden entirely when lastMaterial is null.
 */
export default function ResumeStudyCard({ lastMaterial, onResume }) {
  if (!lastMaterial?.id) return null;

  const view    = lastMaterial.lastView || "summary";
  const meta    = VIEW_META[view] || VIEW_META.summary;
  const Icon    = meta.icon;
  const elapsed = lastMaterial.lastAccessed
    ? formatElapsed(lastMaterial.lastAccessed)
    : null;

  return (
    <div className="flex items-center gap-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] px-5 py-4">
      {/* Icon */}
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: "var(--accent-soft)" }}
      >
        <BookOpen size={18} style={{ color: "var(--accent)" }} />
      </div>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Continue Study
        </p>
        <p className="truncate text-sm font-bold text-[var(--text-primary)]">
          {lastMaterial.title}
        </p>
        <div className="mt-0.5 flex items-center gap-1.5">
          <Icon size={11} className="text-[var(--text-faint)]" />
          <span className="text-[11px] text-[var(--text-faint)]">{meta.label}</span>
          {elapsed && (
            <span className="text-[11px] text-[var(--text-faint)]">· {elapsed}</span>
          )}
        </div>
      </div>

      {/* Resume button */}
      <button
        onClick={() => onResume?.(lastMaterial.id, view)}
        className="flex shrink-0 items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold text-black transition hover:opacity-90 active:scale-95"
        style={{ backgroundColor: "var(--accent)" }}
      >
        <Play size={12} fill="currentColor" />
        Resume
      </button>
    </div>
  );
}

/* ── Helper ────────────────────────────── */
function formatElapsed(ts) {
  const diffMs  = Date.now() - ts;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1)   return "just now";
  if (diffMin < 60)  return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24)   return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}
