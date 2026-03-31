import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";
import PasswordField from "../../components/common/PasswordField";
import PasswordStrengthMeter from "../../components/common/PasswordStrengthMeter";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { isAuthenticated, login } = useAuth();
  const [visible, setVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: ""
  });

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const onSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    try {
      const { data } = await api.post("/auth/register", form, { timeout: 45000 });
      // Auto-login: store token and user from register response
      if (data.token) {
        localStorage.setItem("aistudypal_token", data.token);
        window.location.href = "/dashboard";
      } else {
        toast.success("Account created! Please log in.");
        navigate("/login");
      }
    } catch (error) {
      if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
        toast.error("Server is waking up. Please wait a moment and try again.");
      } else {
        toast.error(error.response?.data?.message || "Registration failed");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-hero-grid lg:grid-cols-[0.95fr_1.05fr]">
      <div className="flex items-center justify-center px-5 py-10">
        <form
          onSubmit={onSubmit}
          className="w-full max-w-xl rounded-[32px] border border-white/10 bg-[#121212]/95 p-8 shadow-glow"
        >
          <p className="text-sm uppercase tracking-[0.3em] text-highlight">Create account</p>
          <h1 className="mt-3 font-display text-3xl text-white">Register</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Build your learning workspace with secure auth, email verification,
            and protected dashboard access.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm text-zinc-300">Username</span>
              <input
                value={form.username}
                onChange={(event) =>
                  setForm((current) => ({ ...current, username: event.target.value }))
                }
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-white outline-none placeholder:text-zinc-500"
                placeholder="maria_ux"
                required
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm text-zinc-300">Email</span>
              <input
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({ ...current, email: event.target.value }))
                }
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-white outline-none placeholder:text-zinc-500"
                placeholder="maria@email.com"
                required
              />
            </label>
          </div>

          <div className="mt-4 space-y-4">
            <PasswordField
              label="Password"
              value={form.password}
              onChange={(event) =>
                setForm((current) => ({ ...current, password: event.target.value }))
              }
              placeholder="Minimum 8 chars, upper, lower, number or symbol"
              visible={visible}
              onToggle={() => setVisible((current) => !current)}
            />
            <PasswordStrengthMeter password={form.password} />
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-zinc-400">
            Password rules: at least 1 uppercase letter, 1 lowercase letter,
            1 number or symbol, and 8+ characters.
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-6 w-full rounded-2xl bg-highlight px-4 py-4 font-semibold text-black transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Creating account..." : "Create account"}
          </button>

          <p className="mt-6 text-sm text-zinc-400">
            Already registered?{" "}
            <Link to="/login" className="font-semibold text-highlight">
              Login
            </Link>
          </p>
        </form>
      </div>

      <div className="hidden p-8 lg:block">
        <div className="flex h-full flex-col justify-between rounded-[32px] border border-white/10 bg-[#0f0f0f]/90 p-10">
          <div>
            <p className="mb-4 text-xs uppercase tracking-[0.35em] text-highlight">Why AI Study Pal?</p>
            <h2 className="max-w-lg font-display text-5xl text-white leading-tight">
              Master any subject smarter, faster, and with confidence.
            </h2>
            <p className="mt-6 text-base text-zinc-300 leading-relaxed">
              Stop drowning in notes. AI Study Pal generates personalized study plans, adaptive quizzes, and intelligent summaries—all tailored to your learning pace.
            </p>
          </div>
          <div className="grid gap-4 space-y-3">
            {[
              {
                title: "🎯 Smart Learning Paths",
                desc: "AI-powered recommendations adapt to your progress and learning style"
              },
              {
                title: "⚡ Instant Summaries",
                desc: "Condense any material into bite-sized, easy-to-digest summaries"
              },
              {
                title: "📊 Adaptive Quizzes",
                desc: "Test yourself on questions that target your weak areas"
              },
              {
                title: "📈 Progress Tracking",
                desc: "Visualize your improvement with detailed analytics and insights"
              }
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-3xl border border-white/10 bg-gradient-to-r from-highlight/10 via-transparent to-transparent p-5 hover:border-highlight/30 transition-colors"
              >
                <p className="font-semibold text-white mb-1">{item.title}</p>
                <p className="text-xs text-zinc-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
