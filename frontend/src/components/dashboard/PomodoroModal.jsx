import { useState, useEffect, useRef, useCallback } from "react";
import {
  Play, Pause, RotateCcw, SkipForward, X, Settings,
  Clock, Coffee, Sun, Minus, Plus, Volume2, VolumeX,
} from "lucide-react";
import toast from "react-hot-toast";

/* ── defaults ──────────────────────────────────── */
const DEFAULT_FOCUS = 25;
const DEFAULT_BREAK = 5;
const DEFAULT_LONG_BREAK = 15;
const SESSIONS_BEFORE_LONG = 4;

/* ── helpers ───────────────────────────────────── */
const fmt = (n) => String(n).padStart(2, "0");

/* ── notification sound (web audio) ────────────── */
function playChime(frequency = 660, duration = 0.25, count = 2) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    for (let i = 0; i < count; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.3, ctx.currentTime + i * (duration + 0.1));
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * (duration + 0.1) + duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * (duration + 0.1));
      osc.stop(ctx.currentTime + i * (duration + 0.1) + duration);
    }
  } catch {
    /* audio not available */
  }
}

export default function PomodoroModal({ open, onClose, currentTask, onSessionComplete }) {
  /* ── settings ─────────────────────────────────── */
  const [focusMin, setFocusMin] = useState(DEFAULT_FOCUS);
  const [breakMin, setBreakMin] = useState(DEFAULT_BREAK);
  const [longBreakMin, setLongBreakMin] = useState(DEFAULT_LONG_BREAK);
  const [longBreakEnabled, setLongBreakEnabled] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  /* ── timer state ──────────────────────────────── */
  const [mode, setMode] = useState("focus");          // "focus" | "break"
  const [time, setTime] = useState(focusMin * 60);
  const [running, setRunning] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const intervalRef = useRef(null);

  /* ── derived ──────────────────────────────────── */
  const totalSeconds = mode === "focus" ? focusMin * 60 : getBreakSeconds();
  const elapsed = totalSeconds - time;
  const pct = totalSeconds > 0 ? (elapsed / totalSeconds) * 100 : 0;
  const mins = fmt(Math.floor(time / 60));
  const secs = fmt(time % 60);

  function getBreakSeconds() {
    if (longBreakEnabled && sessionCount > 0 && sessionCount % SESSIONS_BEFORE_LONG === 0) {
      return longBreakMin * 60;
    }
    return breakMin * 60;
  }

  /* ── switch handler ───────────────────────────── */
  const switchMode = useCallback((nextMode) => {
    setRunning(false);
    setMode(nextMode);
    if (nextMode === "focus") {
      setTime(focusMin * 60);
    } else {
      const newCount = sessionCount + 1;
      setSessionCount(newCount);
      if (longBreakEnabled && newCount % SESSIONS_BEFORE_LONG === 0) {
        setTime(longBreakMin * 60);
      } else {
        setTime(breakMin * 60);
      }
    }
  }, [focusMin, breakMin, longBreakMin, longBreakEnabled, sessionCount]);

  /* ── countdown ────────────────────────────────── */
  useEffect(() => {
    if (!running) {
      clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setTime((t) => {
        if (t <= 1) {
          clearInterval(intervalRef.current);
          setRunning(false);

          if (mode === "focus") {
            if (soundEnabled) playChime(660, 0.25, 2);
            toast("Break time! Relax for a bit.", { icon: "☕", id: "pomo-switch" });
            onSessionComplete?.();
            // defer state switch to avoid stale closure
            setTimeout(() => switchMode("break"), 50);
          } else {
            if (soundEnabled) playChime(880, 0.2, 3);
            toast("Back to focus! Let's go.", { icon: "🔥", id: "pomo-switch" });
            setTimeout(() => switchMode("focus"), 50);
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running, mode, soundEnabled, switchMode, onSessionComplete]);

  /* ── actions ──────────────────────────────────── */
  const reset = () => {
    setRunning(false);
    setTime(mode === "focus" ? focusMin * 60 : getBreakSeconds());
  };

  const skip = () => {
    if (mode === "focus") {
      switchMode("break");
      toast("Skipped to break", { icon: "⏭️", id: "pomo-skip" });
    } else {
      switchMode("focus");
      toast("Skipped to focus", { icon: "⏭️", id: "pomo-skip" });
    }
  };

  const applySettings = () => {
    setShowSettings(false);
    setRunning(false);
    setTime(mode === "focus" ? focusMin * 60 : breakMin * 60);
  };

  /* ── reset timer when settings change ─────────── */
  useEffect(() => {
    if (!running && !showSettings) {
      setTime(mode === "focus" ? focusMin * 60 : getBreakSeconds());
    }
  }, [focusMin, breakMin, longBreakMin, longBreakEnabled]);

  /* ── don't render when closed ─────────────────── */
  if (!open) return null;

  const isFocus = mode === "focus";
  const accentColor = isFocus ? "var(--accent)" : "#4ade80";
  const accentBg = isFocus ? "var(--accent)" : "#4ade8033";
  const accentText = isFocus ? "var(--accent)" : "#4ade80";
  const circumference = 2 * Math.PI * 46;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0a0a0f]/95 backdrop-blur-sm animate-fade-in">

      {/* ── top bar ───────────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: accentColor }} />
          <span className="text-xs font-medium tracking-widest uppercase" style={{ color: accentText }}>
            {isFocus ? "Focus Mode" : "Break Time"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="rounded-lg p-2 text-[#666] transition hover:text-white hover:bg-white/5"
            title={soundEnabled ? "Mute" : "Unmute"}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="rounded-lg p-2 text-[#666] transition hover:text-white hover:bg-white/5"
            title="Settings"
          >
            <Settings size={16} />
          </button>
          <button
            onClick={() => { setRunning(false); onClose(); }}
            className="rounded-lg p-2 text-[#666] transition hover:text-white hover:bg-white/5"
            title="Exit"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* ── main content ──────────────────────────── */}
      <div className="flex flex-col items-center gap-8 select-none">

        {/* session counter */}
        <div className="flex items-center gap-2">
          {Array.from({ length: SESSIONS_BEFORE_LONG }, (_, i) => (
            <div
              key={i}
              className="h-1.5 w-6 rounded-full transition-all duration-500"
              style={{
                backgroundColor: i < (sessionCount % SESSIONS_BEFORE_LONG) || (sessionCount > 0 && sessionCount % SESSIONS_BEFORE_LONG === 0 && mode === "break")
                  ? accentColor : "#222"
              }}
            />
          ))}
        </div>

        {/* circular timer */}
        <div className="relative">
          <svg className="-rotate-90" width="260" height="260" viewBox="0 0 100 100">
            {/* track */}
            <circle cx="50" cy="50" r="46" fill="none" stroke="#1a1a24" strokeWidth="4" />
            {/* progress */}
            <circle
              cx="50" cy="50" r="46" fill="none"
              stroke={accentColor}
              strokeWidth="4" strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - pct / 100)}
              style={{ transition: "stroke-dashoffset 1s linear, stroke 0.5s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-6xl font-extralight tabular-nums text-white tracking-tight">
              {mins}<span className="opacity-40">:</span>{secs}
            </span>
            <div className="mt-2 flex items-center gap-1.5">
              {isFocus
                ? <Sun size={12} style={{ color: accentText }} />
                : <Coffee size={12} style={{ color: accentText }} />
              }
              <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: accentText }}>
                {isFocus ? "Focus" : "Break"}
              </span>
            </div>
          </div>
        </div>

        {/* current task */}
        {currentTask && (
          <div className="max-w-xs text-center animate-fade-in">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#555]">Studying</p>
            <p className="mt-1 text-sm font-medium text-[#999] truncate">{currentTask}</p>
          </div>
        )}

        {/* controls */}
        <div className="flex items-center gap-4">
          <button
            onClick={reset}
            className="group rounded-xl p-3 text-[#555] transition hover:bg-white/5 hover:text-white"
            title="Reset"
          >
            <RotateCcw size={18} className="transition group-hover:rotate-[-45deg]" />
          </button>

          <button
            onClick={() => setRunning(!running)}
            className="flex items-center justify-center rounded-2xl h-16 w-16 transition-all duration-300 active:scale-90"
            style={{
              backgroundColor: running ? "#ef444433" : accentColor,
              color: running ? "#ef4444" : "#000",
            }}
          >
            {running ? <Pause size={24} /> : <Play size={24} className="ml-0.5" />}
          </button>

          <button
            onClick={skip}
            className="group rounded-xl p-3 text-[#555] transition hover:bg-white/5 hover:text-white"
            title="Skip"
          >
            <SkipForward size={18} />
          </button>
        </div>

        {/* session info */}
        <p className="text-[11px] text-[#444]">
          Session {sessionCount + 1} &middot; {focusMin}m focus / {breakMin}m break
          {longBreakEnabled && <> &middot; {longBreakMin}m long break every {SESSIONS_BEFORE_LONG}</>}
        </p>
      </div>

      {/* ── settings panel ────────────────────────── */}
      {showSettings && (
        <div
          className="absolute right-6 top-16 w-72 rounded-2xl border border-[#222] bg-[#111118] p-5 shadow-2xl animate-fade-in"
        >
          <h3 className="text-sm font-bold text-white mb-4">Timer Settings</h3>

          <SettingRow label="Focus" value={focusMin} min={1} max={120} onChange={setFocusMin} suffix="min" />
          <SettingRow label="Break" value={breakMin} min={1} max={30} onChange={setBreakMin} suffix="min" />

          <div className="mt-3 mb-2 flex items-center justify-between">
            <span className="text-xs text-[#888]">Long break</span>
            <button
              onClick={() => setLongBreakEnabled(!longBreakEnabled)}
              className={`relative h-5 w-9 rounded-full transition-colors ${longBreakEnabled ? "bg-[var(--accent)]" : "bg-[#333]"}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${longBreakEnabled ? "translate-x-4" : ""}`}
              />
            </button>
          </div>
          {longBreakEnabled && (
            <SettingRow label="Long break" value={longBreakMin} min={5} max={60} onChange={setLongBreakMin} suffix="min" />
          )}

          <button
            onClick={applySettings}
            className="mt-4 w-full rounded-xl py-2 text-sm font-semibold text-black transition active:scale-95"
            style={{ backgroundColor: "var(--accent)" }}
          >
            Apply
          </button>
        </div>
      )}

      {/* ── inline styles for animation ───────────── */}
      <style>{`
        @keyframes fade-in { from { opacity: 0 } to { opacity: 1 } }
        .animate-fade-in { animation: fade-in 0.3s ease-out; }
      `}</style>
    </div>
  );
}

/* ── Setting row with +/- buttons ─────────────── */
function SettingRow({ label, value, min, max, onChange, suffix }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-xs text-[#888]">{label}</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          className="rounded-md p-1 text-[#666] transition hover:bg-white/5 hover:text-white"
        >
          <Minus size={12} />
        </button>
        <span className="w-10 text-center text-sm font-medium tabular-nums text-white">
          {value}<span className="text-[10px] text-[#555] ml-0.5">{suffix}</span>
        </span>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          className="rounded-md p-1 text-[#666] transition hover:bg-white/5 hover:text-white"
        >
          <Plus size={12} />
        </button>
      </div>
    </div>
  );
}
