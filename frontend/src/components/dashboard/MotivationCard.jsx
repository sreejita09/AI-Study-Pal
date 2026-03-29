import { useEffect, useRef } from "react";
import { Trophy, Zap, AlertTriangle, Flame, X } from "lucide-react";
import { useMotivation } from "../../hooks/useMotivation";

const TYPE_STYLES = {
  success: {
    icon: Trophy,
    glow: "shadow-[0_0_40px_rgba(34,197,94,0.25)]",
    ring: "ring-green-500/30",
    iconColor: "text-green-400",
    accent: "from-green-500/20 to-transparent",
  },
  progress: {
    icon: Zap,
    glow: "shadow-[0_0_40px_rgba(59,130,246,0.25)]",
    ring: "ring-blue-500/30",
    iconColor: "text-blue-400",
    accent: "from-blue-500/20 to-transparent",
  },
  warning: {
    icon: AlertTriangle,
    glow: "shadow-[0_0_40px_rgba(249,115,22,0.25)]",
    ring: "ring-orange-500/30",
    iconColor: "text-orange-400",
    accent: "from-orange-500/20 to-transparent",
  },
  streak: {
    icon: Flame,
    glow: "shadow-[0_0_40px_rgba(249,115,22,0.25)]",
    ring: "ring-orange-500/30",
    iconColor: "text-orange-400",
    accent: "from-orange-500/20 to-transparent",
  },
};

export default function MotivationCard() {
  const { current, dismiss } = useMotivation();
  const cardRef = useRef(null);
  const startY = useRef(null);

  // Swipe-up to dismiss
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const onTouchStart = (e) => { startY.current = e.touches[0].clientY; };
    const onTouchEnd = (e) => {
      if (startY.current === null) return;
      const dy = e.changedTouches[0].clientY - startY.current;
      if (dy < -40) dismiss();
      startY.current = null;
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [current, dismiss]);

  if (!current) return null;

  const cfg = TYPE_STYLES[current.type] || TYPE_STYLES.success;
  const Icon = cfg.icon;
  const isWarning = current.type === "warning";

  return (
    /* backdrop */
    <div className="motivation-backdrop" onClick={dismiss}>
      {/* card */}
      <div
        ref={cardRef}
        onClick={(e) => e.stopPropagation()}
        className={`motivation-card ${cfg.glow} ring-1 ${cfg.ring} ${isWarning ? "motivation-shake" : ""}`}
      >
        {/* accent gradient stripe */}
        <div className={`absolute inset-x-0 top-0 h-1 rounded-t-xl bg-gradient-to-r ${cfg.accent}`} />

        {/* close button */}
        <button
          onClick={dismiss}
          className="absolute right-3 top-3 rounded-md p-1 text-[var(--text-faint)] transition hover:text-[var(--text-primary)]"
        >
          <X size={14} />
        </button>

        {/* icon */}
        <div className={`flex h-11 w-11 items-center justify-center rounded-full bg-[var(--bg-surface)] ${cfg.iconColor}`}>
          <Icon size={22} />
        </div>

        {/* text */}
        <p className="mt-3 text-sm font-semibold text-[var(--text-primary)]">{current.title}</p>
        <p className="mt-1 text-xs text-[var(--text-muted)] leading-relaxed">{current.message}</p>
      </div>
    </div>
  );
}
