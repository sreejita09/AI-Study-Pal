import { useState } from "react";
import { AlertCircle, Plus, X, Check } from "lucide-react";
import { loadTopicStats, getTotalAnswered } from "../../lib/weakTopics";

const EXAMPLE_TOPICS = ["Transmission", "Error Detection"];

/**
 * WeakTopicsCard
 *
 * Props:
 *   topics       {string[]}                    - list of weak topic names
 *   onTopicClick {(topic: string) => void}     - called when user clicks a chip (generates quiz)
 *   onAddTopic   {(topic: string) => void}     - called when user manually adds a topic
 */
export default function WeakTopicsCard({ topics = [], onTopicClick, onAddTopic }) {
  const [showInput, setShowInput] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const stats = loadTopicStats();
  const totalAnswered = getTotalAnswered(stats);
  const hasRealData = totalAnswered > 0;
  const hasTopics = topics.length > 0;

  // "No data yet" state: no quiz attempts AND no manually added topics
  const isEmptyState = !hasRealData && !hasTopics;

  const handleSubmit = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    onAddTopic?.(trimmed);
    setInputValue("");
    setShowInput(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSubmit();
    if (e.key === "Escape") { setShowInput(false); setInputValue(""); }
  };

  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-5">
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <AlertCircle
          size={13}
          className={hasTopics ? "text-orange-400" : "text-[var(--text-faint)]"}
        />
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Weak Topics
        </p>
        {hasRealData && totalAnswered > 0 && (
          <span className="ml-auto text-[10px] text-[var(--text-faint)]">
            from {totalAnswered} question{totalAnswered !== 1 ? "s" : ""} answered
          </span>
        )}
      </div>

      {/* ── No data yet ── */}
      {isEmptyState ? (
        <div className="mb-3">
          <p className="text-sm text-[var(--text-muted)]">
            No data yet — complete a quiz to identify weak areas
          </p>
          {/* Example chips */}
          <div className="mt-3 flex flex-wrap gap-2">
            {EXAMPLE_TOPICS.map((topic) => (
              <span
                key={topic}
                className="flex items-center gap-1.5 rounded-full border border-dashed border-orange-400/30 px-3 py-1 text-xs font-medium text-orange-400/50"
                title="Example — complete a quiz to see your real weak areas"
              >
                {topic}
                <span className="rounded bg-orange-400/10 px-1 py-px text-[9px] font-semibold uppercase tracking-wide text-orange-400/40">
                  example
                </span>
              </span>
            ))}
          </div>
        </div>
      ) : (
        /* ── Real topics ── */
        <div className="mb-3">
          <div className="flex flex-wrap gap-2">
            {topics.map((topic) => (
              <button
                key={topic}
                onClick={() => onTopicClick?.(topic)}
                className="rounded-full bg-orange-400/10 px-3 py-1 text-xs font-medium text-orange-400 transition hover:bg-orange-400/20 hover:scale-[1.02] active:scale-[0.98]"
                title={`Generate quiz for: ${topic}`}
              >
                {topic}
              </button>
            ))}
          </div>
          {hasRealData && (
            <p className="mt-3 text-[10px] text-[var(--text-faint)]">
              Based on your quiz performance · error rate ≥ 30% across quizzes · click a chip to practise
            </p>
          )}
          {!hasRealData && hasTopics && (
            <p className="mt-3 text-[10px] text-[var(--text-faint)]">
              Manually added topics · click a chip to practise
            </p>
          )}
        </div>
      )}

      {/* ── Add Topic ── */}
      {showInput ? (
        <div className="flex items-center gap-2">
          <input
            autoFocus
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. Photosynthesis"
            className="flex-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-1.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:border-[var(--accent)] focus:outline-none transition"
          />
          <button
            onClick={handleSubmit}
            disabled={!inputValue.trim()}
            className="rounded-lg bg-[var(--accent)] px-2.5 py-1.5 text-black disabled:opacity-40 transition hover:opacity-90"
            title="Add topic"
          >
            <Check size={13} />
          </button>
          <button
            onClick={() => { setShowInput(false); setInputValue(""); }}
            className="rounded-lg border border-[var(--border-color)] px-2.5 py-1.5 text-[var(--text-faint)] transition hover:text-[var(--text-muted)]"
            title="Cancel"
          >
            <X size={13} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowInput(true)}
          className="flex items-center gap-1.5 text-[10px] font-medium text-[var(--text-faint)] transition hover:text-[var(--accent)]"
        >
          <Plus size={11} />
          Add Topic
        </button>
      )}
    </div>
  );
}
