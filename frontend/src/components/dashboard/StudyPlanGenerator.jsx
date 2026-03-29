import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

export default function StudyPlanGenerator({ onPlanGenerated }) {
  const [topic, setTopic] = useState("");
  const [days, setDays] = useState("5");
  const [difficulty, setDifficulty] = useState("medium");
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState(null);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    // Simulate AI generation (replace with real API call later)
    await new Promise((r) => setTimeout(r, 1500));
    const fakePlan = Array.from({ length: Number(days) || 3 }, (_, i) => ({
      day: i + 1,
      topics: [
        `${topic} - Core concept ${i + 1}`,
        `Practice exercises for day ${i + 1}`,
        i % 2 === 0 ? "Review previous material" : "Quiz on key points"
      ]
    }));
    setPlan(fakePlan);
    if (onPlanGenerated) onPlanGenerated({ topic, days, difficulty, plan: fakePlan });
    setLoading(false);
  };

  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-6">
      <div className="mb-5 flex items-center gap-2">
        <Sparkles size={18} className="text-accent" />
        <h2 className="font-display text-lg font-bold text-[var(--text-primary)]">Study Plan Generator</h2>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Topic (e.g. Computer Networks)"
          className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-faint)] focus:border-[var(--accent)]"
        />
        <input
          value={days}
          onChange={(e) => setDays(e.target.value)}
          placeholder="Days available"
          type="number"
          min="1"
          max="30"
          className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-faint)] focus:border-[var(--accent)]"
        />
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
        >
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>

      <button
        onClick={handleGenerate}
        disabled={loading || !topic.trim()}
        className="mt-4 flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-accent/90 disabled:opacity-50"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
        {loading ? "Generating..." : "Generate Study Plan"}
      </button>

      {plan && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {plan.map((day) => (
            <div
              key={day.day}
              className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4"
            >
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-accent">
                Day {day.day}
              </p>
              <ul className="space-y-1">
                {day.topics.map((t, i) => (
                  <li key={i} className="text-sm text-[var(--text-muted)]">
                    • {t}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
