import { Sparkles } from "lucide-react";

const FALLBACK_TOPICS = ["Transmission", "Error Detection"];

/**
 * Pure decision logic — no side-effects, safe to call with missing data.
 *
 * @param {{ weakTopics: string[], lastMaterial: object|null }} input
 * @returns {{ text: string, action: "quiz"|"resume", topic: string|null }}
 */
function getSuggestion({ weakTopics = [], lastMaterial = null }) {
  if (weakTopics.length > 0) {
    return {
      text: `Take a quiz on "${weakTopics[0]}" to sharpen your weak area`,
      action: "quiz",
      topic: weakTopics[0],
    };
  }

  if (lastMaterial?.id) {
    return {
      text: `Continue studying "${lastMaterial.title}"`,
      action: "resume",
      topic: null,
    };
  }

  // Fallback — feels personalised even without real data
  return {
    text: `Start with a quick quiz on "${FALLBACK_TOPICS[0]}" to assess your level`,
    action: "quiz",
    topic: FALLBACK_TOPICS[0],
  };
}

/**
 * AISuggestionCard
 *
 * Props:
 *   weakTopics   {string[]}
 *   lastMaterial {{ id, title, lastView, ... } | null}
 *   onQuiz       (topic: string) => void
 *   onResume     (id: string, view: string) => void
 */
export default function AISuggestionCard({ weakTopics = [], lastMaterial = null, onQuiz, onResume }) {
  const suggestion = getSuggestion({ weakTopics, lastMaterial });

  const handleStart = () => {
    if (suggestion.action === "quiz") {
      onQuiz?.(suggestion.topic || FALLBACK_TOPICS[0]);
    } else {
      onResume?.(lastMaterial.id, lastMaterial.lastView || "summary");
    }
  };

  return (
    <div
      className="flex items-center gap-4 rounded-xl border border-[var(--accent-border)] px-5 py-4"
      style={{ backgroundColor: "var(--accent-faint)" }}
    >
      {/* Icon */}
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: "var(--accent-soft)" }}
      >
        <Sparkles size={16} style={{ color: "var(--accent)" }} />
      </div>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider"
           style={{ color: "var(--accent)" }}>
          AI Suggestion
        </p>
        <p className="text-sm font-medium text-[var(--text-primary)] leading-snug">
          {suggestion.text}
        </p>
      </div>

      {/* Action */}
      <button
        onClick={handleStart}
        className="shrink-0 rounded-lg px-4 py-2 text-xs font-bold text-black transition hover:opacity-90 active:scale-95"
        style={{ backgroundColor: "var(--accent)" }}
      >
        Start
      </button>
    </div>
  );
}
