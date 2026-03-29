import { useState, useEffect, useRef, useCallback } from "react";
import { Bell, BellOff, Check, CheckCheck, Clock, X, Mail, MailX, Trophy } from "lucide-react";
import api from "../../lib/api";
import { useTheme } from "../../context/ThemeContext";

const TYPE_CONFIG = {
  reminder:    { color: "#3B82F6", bg: "rgba(59,130,246,0.12)",  label: "Reminder" },
  warning:     { color: "#F97316", bg: "rgba(249,115,22,0.12)",  label: "Warning" },
  streak:      { color: "#A855F7", bg: "rgba(168,85,247,0.12)",  label: "Streak" },
  achievement: { color: "#22C55E", bg: "rgba(34,197,94,0.12)",   label: "Achievement" },
};

function timeAgo(iso) {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)  return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  } catch {
    return "";
  }
}

export default function NotificationBell() {
  const { accentColor } = useTheme();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);
  const bellRef = useRef(null);

  // ── Fetch notifications ────────────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    try {
      const { data } = await api.get("/notifications");
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      // silent — don't block UI on network errors
    }
  }, []);

  // ── Fetch user email pref ──────────────────────────────────────────────
  const fetchEmailPref = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      setEmailEnabled(data.user?.preferences?.emailNotifications ?? false);
    } catch {}
  }, []);

  // ── On mount: trigger check + fetch + poll every 60s ──────────────────
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const { data } = await api.post("/notifications/check");
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      } catch {
        await fetchNotifications();
      } finally {
        setLoading(false);
      }
      fetchEmailPref();
    };
    init();

    const interval = setInterval(fetchNotifications, 60_000);
    return () => clearInterval(interval);
  }, [fetchNotifications, fetchEmailPref]);

  // ── Close on outside click ────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    function handler(e) {
      if (
        panelRef.current && !panelRef.current.contains(e.target) &&
        bellRef.current  && !bellRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // ── Actions ───────────────────────────────────────────────────────────
  const markRead = async (id) => {
    try {
      await api.patch(`/notifications/read/${id}`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await api.patch("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {}
  };

  const toggleEmail = async () => {
    setLoadingEmail(true);
    try {
      const next = !emailEnabled;
      await api.patch("/notifications/settings", { emailNotifications: next });
      setEmailEnabled(next);
    } catch {}
    finally { setLoadingEmail(false); }
  };

  const displayed = notifications.slice(0, 20);

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        ref={bellRef}
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] text-zinc-400 transition hover:text-white"
        title="Notifications"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span
            className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-black"
            style={{ backgroundColor: accentColor }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          ref={panelRef}
          className="notif-dropdown absolute right-0 top-11 z-50 w-80 rounded-xl border border-[var(--border-color)] bg-[var(--bg-panel)] shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--border-color)] px-4 py-3">
            <div className="flex items-center gap-2">
              <Bell size={14} className="text-zinc-400" />
              <span className="text-sm font-semibold text-[var(--text-primary)]">Notifications</span>
              {unreadCount > 0 && (
                <span
                  className="rounded-full px-1.5 py-0.5 text-[10px] font-bold text-black"
                  style={{ backgroundColor: accentColor }}
                >
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  title="Mark all as read"
                  className="rounded-lg p-1.5 text-zinc-500 transition hover:text-white"
                >
                  <CheckCheck size={14} />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-zinc-500 transition hover:text-white"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Notification list */}
          <div className="max-h-96 overflow-y-auto">
            {loading && (
              <p className="py-8 text-center text-xs text-zinc-500">Loading…</p>
            )}
            {!loading && displayed.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-8">
                <BellOff size={24} className="text-zinc-700" />
                <p className="text-xs text-zinc-500">No notifications yet</p>
              </div>
            )}
            {!loading && displayed.map((n) => {
              const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.reminder;
              return (
                <button
                  key={n._id}
                  onClick={() => !n.read && markRead(n._id)}
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-white/5 ${
                    n.read ? "opacity-60" : ""
                  }`}
                >
                  {/* Type dot */}
                  <span
                    className="mt-1 h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: n.read ? "var(--text-faint)" : cfg.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs leading-snug text-[var(--text-primary)]">
                      {n.message}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span
                        className="rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase"
                        style={{ color: cfg.color, backgroundColor: cfg.bg }}
                      >
                        {cfg.label}
                      </span>
                      <span className="flex items-center gap-0.5 text-[10px] text-[var(--text-muted)]">
                        <Clock size={9} />
                        {timeAgo(n.createdAt)}
                      </span>
                    </div>
                  </div>
                  {!n.read && (
                    <Check size={12} className="mt-1 shrink-0 text-zinc-600" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer: email toggle */}
          <div className="border-t border-[var(--border-color)] px-4 py-3">
            <button
              onClick={toggleEmail}
              disabled={loadingEmail}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-[var(--text-muted)] transition hover:bg-white/5 hover:text-white disabled:opacity-50"
            >
              {emailEnabled ? <Mail size={13} /> : <MailX size={13} />}
              <span className="flex-1 text-left">
                Email notifications: <strong className={emailEnabled ? "text-green-400" : "text-zinc-500"}>{emailEnabled ? "On" : "Off"}</strong>
              </span>
              <span
                className={`h-4 w-7 rounded-full transition-colors ${emailEnabled ? "" : "bg-zinc-700"}`}
                style={emailEnabled ? { backgroundColor: accentColor } : {}}
              >
                <span
                  className={`block h-3 w-3 rounded-full bg-white shadow transition-transform ${emailEnabled ? "translate-x-3.5" : "translate-x-0.5"}`}
                  style={{ marginTop: "2px" }}
                />
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
