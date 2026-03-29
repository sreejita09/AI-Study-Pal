import { useState, useEffect } from "react";
import {
  Target, Flame, Zap, Trophy, TrendingUp,
  CalendarDays, Clock, CheckCircle2, Loader2
} from "lucide-react";
import api from "../../lib/api";

function formatMins(m) {
  if (!m) return "0m";
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60 ? `${m % 60}m` : ""}`.trim();
}

function ProgressBar({ value = 0, max = 100, color = "bg-[var(--accent)]", height = "h-2" }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={`w-full ${height} rounded-full bg-[var(--bg-hover)] overflow-hidden`}>
      <div
        className={`${height} rounded-full ${color} transition-all duration-500`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function StatPill({ icon: Icon, label, value, color = "text-[var(--accent)]" }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-2.5">
      <Icon size={15} className={`shrink-0 ${color}`} />
      <div>
        <p className="text-xs font-bold text-[var(--text-primary)]">{value}</p>
        <p className="text-[10px] text-[var(--text-faint)]">{label}</p>
      </div>
    </div>
  );
}

export default function ProgressWidgets({ refreshTrigger = 0 }) {
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProgress = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/progress");
      setProgress(data);
    } catch {
      /* silent — widgets are non-essential */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProgress(); }, [refreshTrigger]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 size={20} className="animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  if (!progress) return null;

  const { overall = {}, today = {}, weekly = [], perMaterial = [], gamification = {} } = progress;
  const weekMax = Math.max(...weekly.map((d) => d.total || 0), 1);

  const onTrackColor =
    overall.onTrack === true
      ? "text-green-400"
      : overall.completionPercent < 50
      ? "text-red-400"
      : "text-orange-400";

  const onTrackLabel =
    overall.onTrack === true ? "On Track" :
    overall.completionPercent < 50 ? "Behind" : "Slightly Behind";

  return (
    <div className="space-y-4">
      {/* Gamification bar */}
      <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Level {gamification.level ?? 1}</p>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
              <Flame size={13} className="text-orange-400" />
              {gamification.streak ?? 0} day streak
            </span>
            <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
              <Zap size={13} className="text-[var(--accent)]" />
              {gamification.xp ?? 0} XP
            </span>
          </div>
        </div>
        <ProgressBar
          value={(gamification.xp ?? 0) % 100}
          max={100}
          color="bg-[var(--accent)]"
        />
        <p className="mt-1 text-[10px] text-[var(--text-faint)]">
          {100 - ((gamification.xp ?? 0) % 100)} XP to Level {(gamification.level ?? 1) + 1}
        </p>

        {/* Daily goal */}
        {gamification.dailyGoal > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <Target size={12} className="text-blue-400 shrink-0" />
            <div className="flex-1">
              <div className="flex justify-between text-[10px] text-[var(--text-faint)] mb-1">
                <span>Daily goal</span>
                <span>{gamification.dailyTasksDone ?? 0}/{gamification.dailyGoal}</span>
              </div>
              <ProgressBar
                value={gamification.dailyTasksDone ?? 0}
                max={gamification.dailyGoal}
                color="bg-blue-400"
                height="h-1.5"
              />
            </div>
          </div>
        )}
      </div>

      {/* Overall stats */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatPill
          icon={CheckCircle2}
          label="Overall"
          value={`${overall.doneTasks ?? 0}/${overall.totalTasks ?? 0}`}
          color="text-green-400"
        />
        <StatPill
          icon={Target}
          label="Today"
          value={today.total > 0 ? `${today.done ?? 0}/${today.total}` : "—"}
          color="text-blue-400"
        />
        <StatPill
          icon={Clock}
          label="Study time"
          value={formatMins(overall.totalStudyMinutes ?? 0)}
          color="text-purple-400"
        />
        <StatPill
          icon={TrendingUp}
          label="Status"
          value={overall.totalTasks > 0 ? onTrackLabel : "—"}
          color={onTrackColor}
        />
      </div>

      {/* Weekly activity chart */}
      {weekly.length > 0 && (
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">This Week</p>
          <div className="flex items-end gap-1.5 h-16">
            {weekly.map((day, i) => {
              const pct = weekMax > 0 ? (day.total > 0 ? (day.done / day.total) : 0) : 0;
              const heightPct = weekMax > 0 ? Math.round((day.total / weekMax) * 100) : 0;
              const isToday = day.date === new Date().toISOString().slice(0, 10);
              return (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <div className="w-full flex-1 relative rounded-sm overflow-hidden bg-[var(--bg-hover)]" style={{ minHeight: "4px" }}>
                    <div
                      className={`absolute bottom-0 left-0 w-full rounded-sm transition-all duration-500 ${isToday ? "bg-[var(--accent)]" : "bg-green-400/60"}`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <span className={`text-[9px] ${isToday ? "text-[var(--accent)] font-bold" : "text-[var(--text-faint)]"}`}>
                    {day.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Per-material progress */}
      {perMaterial.length > 0 && (
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">By Material</p>
          <div className="space-y-2.5">
            {perMaterial.map((m, i) => {
              const pct = m.total > 0 ? Math.round((m.done / m.total) * 100) : 0;
              return (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="truncate text-[var(--text-primary)] max-w-[60%]">{m.title}</span>
                    <span className="text-[var(--text-muted)] shrink-0">{m.done}/{m.total} · {pct}%</span>
                  </div>
                  <ProgressBar value={m.done} max={m.total} color={pct >= 100 ? "bg-green-400" : "bg-[var(--accent)]"} height="h-1.5" />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
