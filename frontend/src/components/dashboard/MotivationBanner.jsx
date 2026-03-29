import { useState, useEffect, useCallback } from "react";
import { X, RefreshCw, Zap, Trophy, AlertTriangle, Clock, Star } from "lucide-react";
import api from "../../lib/api";

const TYPE_CONFIG = {
  success:      { icon: Trophy,        color: "text-green-400",           bg: "bg-green-400/8",             border: "border-green-400/20"           },
  day_complete: { icon: Star,          color: "text-[var(--accent)]",     bg: "bg-[var(--bg-hover)]",       border: "border-[var(--accent)]"         },
  consistency:  { icon: Zap,          color: "text-blue-400",            bg: "bg-blue-400/8",              border: "border-blue-400/20"            },
  behind:       { icon: AlertTriangle, color: "text-orange-400",          bg: "bg-orange-400/8",            border: "border-orange-400/20"          },
  low_activity: { icon: Clock,         color: "text-[var(--text-muted)]", bg: "bg-[var(--bg-surface)]",    border: "border-[var(--border-color)]"  },
  comeback:     { icon: Zap,          color: "text-purple-400",          bg: "bg-purple-400/8",            border: "border-purple-400/20"          },
};

const DEFAULT_CONFIG = TYPE_CONFIG.consistency;

export default function MotivationBanner({ taskJustCompleted = false }) {
  const [motivation, setMotivation] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMotivation = useCallback(async () => {
    setRefreshing(true);
    setDismissed(false);
    try {
      const { data } = await api.post("/progress/motivation", { taskJustCompleted });
      setMotivation(data);
    } catch {
      /* silent — banner is non-essential */
    } finally {
      setRefreshing(false);
    }
  }, [taskJustCompleted]);

  useEffect(() => {
    fetchMotivation();
  }, [fetchMotivation]);

  // Re-fetch when a task is completed
  useEffect(() => {
    if (taskJustCompleted) fetchMotivation();
  }, [taskJustCompleted]);

  if (!motivation || dismissed) return null;

  const cfg = TYPE_CONFIG[motivation.type] || DEFAULT_CONFIG;
  const Icon = cfg.icon;

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${cfg.bg} ${cfg.border} backdrop-blur-sm`}
    >
      <Icon size={16} className={`mt-0.5 shrink-0 ${cfg.color}`} />
      <p className={`flex-1 text-sm leading-snug ${cfg.color}`}>{motivation.message}</p>
      <div className="flex shrink-0 items-center gap-1">
        <button
          onClick={fetchMotivation}
          disabled={refreshing}
          className="rounded-md p-1 text-[var(--text-faint)] transition hover:text-[var(--text-primary)] disabled:opacity-40"
          title="New message"
        >
          <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="rounded-md p-1 text-[var(--text-faint)] transition hover:text-[var(--text-primary)]"
          title="Dismiss"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
}
