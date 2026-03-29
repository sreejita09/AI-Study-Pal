import { useState } from "react";
import {
  ArrowLeft, X, ChevronRight,
  Trophy, TrendingUp, AlertCircle,
} from "lucide-react";

import { getWeakTopics, saveWeakTopics, updateTopicStats, computeWeakFromStats, loadTopicStats } from "../../lib/weakTopics";

function getDiffNote(accuracy) {
  if (accuracy >= 85) return { label: "Excellent! Try a harder difficulty", color: "text-green-400" };
  if (accuracy >= 60) return { label: "Good effort — keep practicing", color: "text-[var(--accent)]" };
  return { label: "Review weak topics and retry", color: "text-orange-400" };
}

/* ── Result Screen ───────────────────────── */
function ResultScreen({ questions, answers, materialTitle, onRetry, onClose }) {
  const score    = answers.filter((a) => a.correct).length;
  const accuracy = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
  // Show topics missed in THIS quiz for immediate feedback
  const weak     = getWeakTopics(questions, answers);
  const diff     = getDiffNote(accuracy);

  return (
    <div className="flex flex-1 items-center justify-center overflow-y-auto px-6 py-10">
      <div className="w-full max-w-md space-y-5">
        {/* Trophy header */}
        <div className="text-center">
          <div
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full"
            style={{ backgroundColor: "var(--accent-soft)" }}
          >
            <Trophy size={28} style={{ color: "var(--accent)" }} />
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Quiz Complete!</h2>
          {materialTitle && (
            <p className="mt-1 text-sm text-[var(--text-muted)]">{materialTitle}</p>
          )}
        </div>

        {/* Score strip */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4 text-center">
            <p className="text-3xl font-bold text-[var(--text-primary)]">
              {score}
              <span className="text-lg text-[var(--text-muted)]">/{questions.length}</span>
            </p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">Score</p>
          </div>
          <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4 text-center">
            <p
              className={`text-3xl font-bold ${
                accuracy >= 80 ? "text-green-400" : accuracy >= 60 ? "text-[var(--accent)]" : "text-orange-400"
              }`}
            >
              {accuracy}%
            </p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">Accuracy</p>
          </div>
        </div>

        {/* Difficulty note */}
        <div className="flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] px-4 py-3">
          <TrendingUp size={14} className={diff.color} />
          <span className={`text-sm font-medium ${diff.color}`}>{diff.label}</span>
        </div>

        {/* Weak topics */}
        {weak.length > 0 && (
          <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4">
            <div className="mb-2 flex items-center gap-2">
              <AlertCircle size={13} className="text-orange-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Needs Review
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {weak.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-orange-400/10 px-3 py-1 text-xs font-medium text-orange-400"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Answer breakdown (compact) */}
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">
            Answer Breakdown
          </p>
          {questions.map((q, i) => {
            const a = answers[i];
            return (
              <div key={i} className="flex items-start gap-2">
                <span
                  className={`mt-0.5 shrink-0 text-xs font-bold ${a?.correct ? "text-green-400" : "text-red-400"}`}
                >
                  {a?.correct ? "✓" : "✗"}
                </span>
                <p className="text-xs text-[var(--text-primary)] leading-snug line-clamp-2">{q.question}</p>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onRetry}
            className="flex-1 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] py-3 text-sm font-semibold text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
          >
            Retry Quiz
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded-xl py-3 text-sm font-bold text-black transition hover:opacity-90"
            style={{ backgroundColor: "var(--accent)" }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Quiz Screen ─────────────────────────── */
export default function QuizScreen({ questions = [], materialTitle = "", onClose, onQuizComplete }) {
  const [current, setCurrent]   = useState(0);
  const [answers, setAnswers]   = useState([]);    // { selected, correct, explanation, topic }
  const [selected, setSelected] = useState(null);
  const [done, setDone]         = useState(false);

  const q             = questions[current];
  const answered      = selected !== null;
  const correctAnswer = q?.answer || q?.correctAnswer || "";
  const isCorrect     = selected === correctAnswer;
  const progressPct   = questions.length > 0 ? Math.round((current / questions.length) * 100) : 0;

  const handleSelect = (opt) => {
    if (answered) return;
    setSelected(opt);
  };

  const handleNext = () => {
    const newAnswers = [
      ...answers,
      {
        selected,
        correct:     selected === correctAnswer,
        explanation: q?.explanation || "",
        topic:       q?.topic || "General",
      },
    ];
    setAnswers(newAnswers);
    setSelected(null);

    if (current + 1 >= questions.length) {
      // 1. Accumulate performance data into per-topic stats
      const updatedStats = updateTopicStats(questions, newAnswers);
      // 2. Derive canonical weak topics from accumulated stats (legit error rates)
      //    Fall back to single-session topics if stats haven't built up enough data yet
      const statsWeak = computeWeakFromStats(updatedStats);
      const weak = statsWeak.length > 0 ? statsWeak : getWeakTopics(questions, newAnswers);
      saveWeakTopics(weak);
      onQuizComplete?.(weak);
      setDone(true);
    } else {
      setCurrent((c) => c + 1);
    }
  };

  const handleRetry = () => {
    setCurrent(0);
    setAnswers([]);
    setSelected(null);
    setDone(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--bg-base)]">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[var(--border-color)] bg-[var(--bg-panel)] px-5 py-3.5">
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-[var(--text-muted)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
          title="Exit quiz"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
            {materialTitle || "Quiz"}
          </p>
          {!done && (
            <p className="text-xs text-[var(--text-muted)]">
              Question {current + 1} of {questions.length}
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-[var(--text-muted)] transition hover:bg-[var(--bg-hover)]"
        >
          <X size={16} />
        </button>
      </div>

      {/* Progress bar (only during questions) */}
      {!done && (
        <div className="h-0.5 bg-[var(--bg-hover)]">
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${progressPct}%`, backgroundColor: "var(--accent)" }}
          />
        </div>
      )}

      {done ? (
        <ResultScreen
          questions={questions}
          answers={answers}
          materialTitle={materialTitle}
          onRetry={handleRetry}
          onClose={onClose}
        />
      ) : (
        <div className="flex flex-1 items-start justify-center overflow-y-auto px-6 py-10">
          <div className="w-full max-w-xl space-y-5">
            {/* Question text */}
            <p className="text-lg font-semibold leading-relaxed text-[var(--text-primary)]">
              <span className="mr-2 text-[var(--accent)]">{current + 1}.</span>
              {q?.question}
            </p>

            {/* Options */}
            <div className="space-y-3">
              {(q?.options || []).map((opt, i) => {
                const isSel    = selected === opt;
                const isAns    = answered && opt === correctAnswer;
                const isWrong  = answered && isSel && !isCorrect;

                let cls =
                  "flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left text-sm transition";

                if (!answered) {
                  cls += isSel
                    ? " border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                    : " border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[var(--accent)] cursor-pointer";
                } else {
                  if (isAns)        cls += " border-green-500/50 bg-green-500/10 text-green-400";
                  else if (isWrong) cls += " border-red-500/50 bg-red-500/10 text-red-400";
                  else              cls += " border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-muted)] opacity-50";
                }

                return (
                  <button
                    key={i}
                    onClick={() => handleSelect(opt)}
                    disabled={answered}
                    className={cls}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-current text-xs font-bold">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="flex-1">{opt}</span>
                  </button>
                );
              })}
            </div>

            {/* Explanation (shown immediately after selecting) */}
            {answered && q?.explanation && (
              <div
                className={`rounded-xl border px-4 py-3 text-sm ${
                  isCorrect
                    ? "border-green-500/30 bg-green-500/10"
                    : "border-red-500/30 bg-red-500/10"
                }`}
              >
                <p className={`mb-1 font-semibold ${isCorrect ? "text-green-400" : "text-red-400"}`}>
                  {isCorrect ? "✓ Correct!" : "✗ Not quite."}
                </p>
                <p className="text-[var(--text-muted)]">{q.explanation}</p>
              </div>
            )}

            {/* Next / Finish button */}
            {answered && (
              <button
                onClick={handleNext}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-black transition hover:opacity-90"
                style={{ backgroundColor: "var(--accent)" }}
              >
                {current + 1 >= questions.length ? (
                  "Finish Quiz"
                ) : (
                  <>
                    Next Question <ChevronRight size={16} />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
