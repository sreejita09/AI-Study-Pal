import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Sun, Moon, KeyRound, LogOut, Trash2, Save,
  Flame, Zap, Clock, Target, Check, Bell, BellOff, Mail, MailX,
  Shield, User, Palette, BookOpen, AlertCircle,
} from "lucide-react";
import api from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import { useTheme, ACCENT_COLORS } from "../context/ThemeContext";
import showToast from "../lib/showToast";

/* ── small helpers ──────────────────────────────────────────────────── */
function Section({ title, icon: Icon, children }) {
  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-6 space-y-5">
      <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-4">
        <Icon size={16} className="text-[var(--accent)]" />
        <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--text-muted)]">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Row({ label, hint, children }) {
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
        {hint && <p className="text-xs text-[var(--text-muted)] mt-0.5">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ value, onChange }) {
  return (
    <button
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={`relative h-6 w-11 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${value ? "" : "bg-[var(--bg-hover)]"}`}
      style={value ? { backgroundColor: "var(--accent)" } : {}}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${value ? "translate-x-5" : "translate-x-0"}`}
      />
    </button>
  );
}

function NumberInput({ value, onChange, min, max, step = 1, label }) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(Math.max(min, value - step))}
        className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-muted)] transition hover:text-[var(--text-primary)] text-sm font-bold"
        aria-label={`Decrease ${label}`}
      >−</button>
      <span className="w-10 text-center text-sm font-semibold text-[var(--text-primary)]">{value}</span>
      <button
        onClick={() => onChange(Math.min(max, value + step))}
        className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-muted)] transition hover:text-[var(--text-primary)] text-sm font-bold"
        aria-label={`Increase ${label}`}
      >+</button>
    </div>
  );
}

/* ── main page ──────────────────────────────────────────────────────── */
export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, setUser, logout } = useAuth();
  const { theme, toggleTheme, accentColor, setAccentColor } = useTheme();

  // Prefs state — synced from user object
  const [emailNotif, setEmailNotif] = useState(false);
  const [inAppNotif, setInAppNotif] = useState(true);
  const [peakEnergy, setPeakEnergy] = useState("morning");
  const [pomodoroMins, setPomodoroMins] = useState(25);
  const [breakMins, setBreakMins] = useState(5);
  const [dailyGoal, setDailyGoal] = useState(3);
  const [prefsDirty, setPrefsDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // Password change
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  // Delete account
  const [deleteModal, setDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Stats
  const [stats, setStats] = useState(null);

  // Populate from user
  useEffect(() => {
    if (!user) return;
    setEmailNotif(user.preferences?.emailNotifications ?? false);
    setInAppNotif(user.preferences?.inAppNotifications ?? true);
    setPeakEnergy(user.preferences?.peakEnergyTime ?? "morning");
    setPomodoroMins(user.preferences?.pomodoroMinutes ?? 25);
    setBreakMins(user.preferences?.breakMinutes ?? 5);
    setDailyGoal(user.gamification?.dailyGoal ?? 3);
    setPrefsDirty(false);
  }, [user]);

  // Fetch progress stats for stat strip
  useEffect(() => {
    api.get("/progress").then(({ data }) => setStats(data)).catch(() => {});
  }, []);

  const markDirty = (fn) => (...args) => { fn(...args); setPrefsDirty(true); };

  const savePreferences = async () => {
    setSaving(true);
    try {
      const { data } = await api.patch("/auth/profile", {
        emailNotifications: emailNotif,
        inAppNotifications: inAppNotif,
        peakEnergyTime: peakEnergy,
        pomodoroMinutes: pomodoroMins,
        breakMinutes: breakMins,
        dailyGoal,
      });
      setUser(data.user);
      setPrefsDirty(false);
      showToast("Preferences saved", "success");
    } catch (err) {
      showToast(err?.response?.data?.error || "Failed to save preferences", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!pwCurrent || !pwNew) return showToast("Fill in both password fields", "error");
    if (pwNew !== pwConfirm) return showToast("Passwords do not match", "error");
    if (pwNew.length < 8) return showToast("New password must be 8+ characters", "error");
    setPwSaving(true);
    try {
      await api.patch("/auth/change-password", { currentPassword: pwCurrent, newPassword: pwNew });
      showToast("Password updated", "success");
      setPwCurrent(""); setPwNew(""); setPwConfirm("");
    } catch (err) {
      showToast(err?.response?.data?.error || "Failed to update password", "error");
    } finally {
      setPwSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) return showToast("Enter your password to confirm", "error");
    setDeleting(true);
    try {
      await api.delete("/auth/account", { data: { password: deletePassword } });
      await logout();
      navigate("/login");
    } catch (err) {
      showToast(err?.response?.data?.error || "Failed to delete account", "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const resetPrefs = () => {
    setPomodoroMins(25);
    setBreakMins(5);
    setDailyGoal(3);
    setPeakEnergy("morning");
    setPrefsDirty(true);
  };

  const initials = user?.username?.[0]?.toUpperCase() || "?";
  const joinDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : null;

  const totalStudyHours = stats
    ? Math.round((stats.overall?.totalMinutes ?? 0) / 60)
    : (user?.learningStats?.totalStudyMinutes ? Math.round(user.learningStats.totalStudyMinutes / 60) : 0);

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
      {/* Top bar */}
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-[var(--border-color)] bg-[var(--bg-panel)]/80 px-6 py-4 backdrop-blur-md">
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-[var(--text-muted)] transition hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={15} />
          Back to dashboard
        </button>
        <span className="text-[var(--text-faint)]">/</span>
        <span className="text-sm font-semibold text-[var(--text-primary)]">Profile & Settings</span>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
        {/* ── Profile Header ────────────────────────────────────── */}
        <div className="flex flex-col items-center gap-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-8">
          <div
            className="flex h-20 w-20 items-center justify-center rounded-full text-3xl font-bold text-black shadow-lg"
            style={{ backgroundColor: "var(--accent)" }}
          >
            {initials}
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-[var(--text-primary)]">{user?.username}</h1>
            <p className="text-sm text-[var(--text-muted)]">{user?.email}</p>
            {joinDate && <p className="mt-1 text-xs text-[var(--text-faint)]">Member since {joinDate}</p>}
          </div>

          {/* Stat strip */}
          <div className="mt-2 flex w-full justify-center gap-6 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-6 py-4">
            <div className="flex flex-col items-center gap-1">
              <Flame size={16} className="text-orange-400" />
              <span className="text-lg font-bold text-[var(--text-primary)]">{user?.learningStats?.currentStreak ?? 0}</span>
              <span className="text-[10px] uppercase tracking-wider text-[var(--text-faint)]">Streak</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Zap size={16} className="text-[var(--accent)]" />
              <span className="text-lg font-bold text-[var(--text-primary)]">{user?.gamification?.xp ?? 0}</span>
              <span className="text-[10px] uppercase tracking-wider text-[var(--text-faint)]">XP</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Clock size={16} className="text-blue-400" />
              <span className="text-lg font-bold text-[var(--text-primary)]">{totalStudyHours}h</span>
              <span className="text-[10px] uppercase tracking-wider text-[var(--text-faint)]">Studied</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Target size={16} className="text-green-400" />
              <span className="text-lg font-bold text-[var(--text-primary)]">Lv {user?.gamification?.level ?? 1}</span>
              <span className="text-[10px] uppercase tracking-wider text-[var(--text-faint)]">Level</span>
            </div>
          </div>
        </div>

        {/* ── Appearance ────────────────────────────────────────── */}
        <Section title="Appearance" icon={Palette}>
          <Row label="Theme" hint="Switch between light and dark mode">
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-1.5 text-sm text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
            >
              {theme === "dark" ? <Moon size={14} /> : <Sun size={14} />}
              {theme === "dark" ? "Dark" : "Light"}
            </button>
          </Row>
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)] mb-3">Accent color</p>
            <div className="flex flex-wrap gap-2">
              {ACCENT_COLORS.map(({ hex, label }) => (
                <button
                  key={hex}
                  onClick={() => setAccentColor(hex)}
                  title={label}
                  aria-label={`Accent color: ${label}`}
                  className="relative h-7 w-7 rounded-full transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                  style={{ backgroundColor: hex }}
                >
                  {accentColor === hex && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <Check size={13} className="text-black drop-shadow" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </Section>

        {/* ── Study Preferences ─────────────────────────────────── */}
        <Section title="Study Preferences" icon={BookOpen}>
          <Row label="Peak energy time" hint="AI schedules harder tasks at this time">
            <div className="flex gap-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-1">
              {["morning", "afternoon", "night"].map((t) => (
                <button
                  key={t}
                  onClick={() => { setPeakEnergy(t); setPrefsDirty(true); }}
                  className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition ${peakEnergy === t ? "text-black" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}
                  style={peakEnergy === t ? { backgroundColor: "var(--accent)" } : {}}
                >
                  {t}
                </button>
              ))}
            </div>
          </Row>
          <Row label="Daily goal" hint="Target tasks to complete per day">
            <NumberInput value={dailyGoal} onChange={markDirty(setDailyGoal)} min={1} max={20} label="daily goal" />
          </Row>
          <Row label="Focus session" hint="Pomodoro work interval (minutes)">
            <NumberInput value={pomodoroMins} onChange={markDirty(setPomodoroMins)} min={5} max={90} step={5} label="focus minutes" />
          </Row>
          <Row label="Break duration" hint="Short break between sessions (minutes)">
            <NumberInput value={breakMins} onChange={markDirty(setBreakMins)} min={1} max={60} step={1} label="break minutes" />
          </Row>
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={resetPrefs}
              className="text-xs text-[var(--text-faint)] transition hover:text-[var(--text-muted)] underline"
            >
              Reset to defaults
            </button>
            {prefsDirty && (
              <button
                onClick={savePreferences}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-semibold text-black transition disabled:opacity-60"
                style={{ backgroundColor: "var(--accent)" }}
              >
                <Save size={13} />
                {saving ? "Saving…" : "Save changes"}
              </button>
            )}
          </div>
        </Section>

        {/* ── Notifications ─────────────────────────────────────── */}
        <Section title="Notifications" icon={Bell}>
          <Row label="Email reminders" hint="Receive email alerts for pending or missed tasks">
            <Toggle value={emailNotif} onChange={(v) => { setEmailNotif(v); setPrefsDirty(true); }} />
          </Row>
          <Row label="In-app notifications" hint="Show the notification bell badge and alerts">
            <Toggle value={inAppNotif} onChange={(v) => { setInAppNotif(v); setPrefsDirty(true); }} />
          </Row>
          {prefsDirty && (
            <div className="flex justify-end pt-1">
              <button
                onClick={savePreferences}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-semibold text-black transition disabled:opacity-60"
                style={{ backgroundColor: "var(--accent)" }}
              >
                <Save size={13} />
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          )}
        </Section>

        {/* ── Account ───────────────────────────────────────────── */}
        <Section title="Account" icon={Shield}>
          {/* Change password */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-[var(--text-primary)]">Change password</p>
            <input
              type="password"
              placeholder="Current password"
              value={pwCurrent}
              onChange={(e) => setPwCurrent(e.target.value)}
              className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-faint)] outline-none focus:border-[var(--accent)] transition"
              autoComplete="current-password"
            />
            <input
              type="password"
              placeholder="New password (8+ characters)"
              value={pwNew}
              onChange={(e) => setPwNew(e.target.value)}
              className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-faint)] outline-none focus:border-[var(--accent)] transition"
              autoComplete="new-password"
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={pwConfirm}
              onChange={(e) => setPwConfirm(e.target.value)}
              className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-faint)] outline-none focus:border-[var(--accent)] transition"
              autoComplete="new-password"
            />
            <button
              onClick={handleChangePassword}
              disabled={pwSaving || !pwCurrent || !pwNew || !pwConfirm}
              className="flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-semibold text-black transition disabled:opacity-50"
              style={{ backgroundColor: "var(--accent)" }}
            >
              <KeyRound size={13} />
              {pwSaving ? "Updating…" : "Update password"}
            </button>
          </div>

          <div className="border-t border-[var(--border-color)] pt-4 mt-2 space-y-3">
            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-lg border border-[var(--border-color)] px-4 py-2.5 text-sm text-[var(--text-muted)] transition hover:border-red-400/40 hover:bg-red-400/5 hover:text-red-400"
            >
              <LogOut size={14} />
              Sign out
            </button>

            {/* Delete account */}
            <button
              onClick={() => setDeleteModal(true)}
              className="flex w-full items-center gap-2 rounded-lg border border-red-500/20 px-4 py-2.5 text-sm text-red-400 transition hover:bg-red-400/5 hover:border-red-400/40"
            >
              <Trash2 size={14} />
              Delete account
            </button>
          </div>
        </Section>
      </div>

      {/* ── Delete confirmation modal ──────────────────────────── */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-red-500/30 bg-[var(--bg-card)] p-6 shadow-2xl">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle size={18} className="text-red-400" />
              <h3 className="text-base font-semibold text-[var(--text-primary)]">Delete account</h3>
            </div>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              This will permanently delete your account, all plans, materials, and progress. This cannot be undone.
            </p>
            <input
              type="password"
              placeholder="Enter your password to confirm"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-faint)] outline-none focus:border-red-400 transition mb-4"
              autoComplete="current-password"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setDeleteModal(false); setDeletePassword(""); }}
                className="flex-1 rounded-lg border border-[var(--border-color)] px-4 py-2 text-sm text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting || !deletePassword}
                className="flex-1 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete forever"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
