import { useState } from "react";
import { ChevronRight, RotateCcw, Trophy, Sparkles } from "lucide-react";

export default function QuizPlayer({ questions = [] }) {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [finished, setFinished] = useState(false);

  if (!questions.length) return null;

  const q = questions[current];
  const isLast = current === questions.length - 1;
  const answer = q.answer || q.correctAnswer;

  const handleSelect = (opt) => {
    if (selected !== null) return;
    setSelected(opt);
    const correct = opt === answer;
    if (correct) setScore((s) => s + 1);
    setAnswers((prev) => [...prev, { question: q.question, selected: opt, correct, explanation: q.explanation }]);
  };

  const handleNext = () => {
    if (isLast) {
      setFinished(true);
      return;
    }
    setCurrent((c) => c + 1);
    setSelected(null);
  };

  const handleRestart = () => {
    setCurrent(0);
    setSelected(null);
    setScore(0);
    setAnswers([]);
    setFinished(false);
  };

  // Final score screen
  if (finished) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="flex flex-col items-center gap-6 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-8 text-center">
        <div className="rounded-2xl bg-[var(--bg-card)] p-4">
          <Trophy size={40} className="text-[var(--accent)]" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-[var(--text-primary)]">Quiz Complete!</h3>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            You scored <span className="font-bold text-[var(--accent)]">{score}/{questions.length}</span> ({pct}%)
          </p>
        </div>

        {/* Score bar */}
        <div className="w-full max-w-xs">
          <div className="h-3 overflow-hidden rounded-full bg-[var(--bg-hover)]">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${pct}%`,
                background: pct >= 80 ? "#22c55e" : pct >= 50 ? "var(--accent)" : "#ef4444",
              }}
            />
          </div>
          <p className="mt-1 text-xs text-[var(--text-faint)]">
            {pct >= 80 ? "Excellent! 🎉" : pct >= 50 ? "Good effort! Keep studying 💪" : "Keep practicing! 📚"}
          </p>
        </div>

        {/* Answer review */}
        <div className="w-full space-y-2 text-left">
          {answers.map((a, i) => (
            <div key={i} className="rounded-lg border border-[var(--border-color)] overflow-hidden">
              <div
                className={`flex items-start gap-2 px-3 py-2 text-sm ${
                  a.correct
                    ? "bg-green-500/10 text-green-400"
                    : "bg-red-500/10 text-red-400"
                }`}
              >
                <span className="mt-0.5 font-bold">{a.correct ? "✓" : "✗"}</span>
                <span className="text-[var(--text-primary)]">{a.question}</span>
              </div>
              {a.explanation && (
                <div className="border-t border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2">
                  <p className="text-xs font-semibold text-[var(--accent)]">
                    👉 Explanation: <span className="font-normal text-[var(--text-muted)]">{a.explanation}</span>
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={handleRestart}
          className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-black transition-all"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          <RotateCcw size={14} />
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
        <span>Question {current + 1} of {questions.length}</span>
        <span className="flex items-center gap-1">
          <Sparkles size={12} className="text-[var(--accent)]" />
          Score: <span className="font-semibold text-[var(--accent)]">{score}</span>
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--bg-hover)]">
        <div
          className="h-full rounded-full bg-[var(--accent)] transition-all duration-300"
          style={{ width: `${((current + (selected !== null ? 1 : 0)) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question */}
      <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-6">
        <p className="mb-5 text-base font-semibold text-[var(--text-primary)] leading-relaxed">
          {q.question}
        </p>

        {/* Options */}
        <div className="space-y-2">
          {q.options?.map((opt, j) => {
            let optClass = "border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] hover:border-[var(--accent)] cursor-pointer";

            if (selected !== null) {
              if (opt === answer) {
                optClass = "border-green-500/40 bg-green-500/15 text-green-400 font-semibold";
              } else if (opt === selected) {
                optClass = "border-red-500/40 bg-red-500/15 text-red-400";
              } else {
                optClass = "border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-faint)] cursor-default";
              }
            }

            return (
              <button
                key={j}
                onClick={() => handleSelect(opt)}
                disabled={selected !== null}
                className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-all duration-200 ${optClass}`}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current text-xs font-bold">
                  {String.fromCharCode(65 + j)}
                </span>
                {opt}
              </button>
            );
          })}
        </div>

        {/* Selected answer indicator + Explanation (fade in) */}
        {selected !== null && (
          <div className="mt-4 space-y-3 animate-[fadeIn_0.4s_ease-out]">
            {/* Selected answer status */}
            <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
              selected === answer
                ? "bg-green-500/10 text-green-400"
                : "bg-red-500/10 text-red-400"
            }`}>
              <span className="font-bold">{selected === answer ? "✅" : "❌"}</span>
              <span>{selected === answer ? "Correct!" : `Wrong — correct answer: ${answer}`}</span>
            </div>

            {/* Explanation */}
            {q.explanation && (
              <div className="rounded-lg border border-[var(--accent)] px-4 py-3" style={{ borderColor: 'color-mix(in srgb, var(--accent) 30%, transparent)', backgroundColor: 'color-mix(in srgb, var(--accent) 8%, transparent)' }}>
                <p className="text-sm">
                  <span className="font-semibold text-[var(--accent)]">👉 Explanation: </span>
                  <span className="text-[var(--text-muted)]">{q.explanation}</span>
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Next button */}
      {selected !== null && (
        <div className="flex justify-end animate-[fadeIn_0.3s_ease-out]">
          <button
            onClick={handleNext}
            className="flex items-center gap-1.5 rounded-lg px-5 py-2.5 text-sm font-semibold text-black transition-all active:scale-95"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            {isLast ? "See Results" : "Next"}
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
