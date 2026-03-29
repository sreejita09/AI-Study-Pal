import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../../hooks/useAuth";
import PasswordField from "../../components/common/PasswordField";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();
  const [visible, setVisible] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const onSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      await login(form);
      toast.success("Welcome back");
      navigate(location.state?.from || "/dashboard", { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-hero-grid lg:grid-cols-[1.1fr_0.9fr]">
      <div className="hidden p-8 lg:block">
        <div className="flex h-full flex-col justify-between rounded-[32px] border border-white/10 bg-[#0f0f0f]/90 p-10">
          <div>
            <p className="mb-4 text-xs uppercase tracking-[0.35em] text-highlight">AI Study Pal</p>
            <h1 className="max-w-lg font-display text-5xl text-white">
              Sign in to your adaptive learning dashboard.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-zinc-400">
              AI-powered study plans, smart quizzes, and focused study sessions
              — all built to help you learn faster and retain more.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { title: "AI Study Plans", desc: "Auto-generated schedules that adapt to your pace and goals" },
              { title: "Smart Quizzes", desc: "Test yourself with AI-crafted questions from your materials" },
              { title: "Focus Timer", desc: "Built-in Pomodoro mode to keep you in the zone" },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-3xl border border-white/10 bg-white/5 p-5"
              >
                <p className="text-sm font-semibold text-white">{item.title}</p>
                <p className="mt-1.5 text-xs leading-5 text-zinc-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center px-5 py-10">
        <form
          onSubmit={onSubmit}
          className="w-full max-w-md rounded-[32px] border border-white/10 bg-[#121212]/95 p-8 shadow-glow"
        >
          <p className="text-sm uppercase tracking-[0.3em] text-highlight">Welcome back</p>
          <h2 className="mt-3 font-display text-3xl text-white">Login</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Enter your email and password to continue into the dashboard.
          </p>

          <div className="mt-8 space-y-4">
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

            <PasswordField
              label="Password"
              value={form.password}
              onChange={(event) =>
                setForm((current) => ({ ...current, password: event.target.value }))
              }
              placeholder="Enter your password"
              visible={visible}
              onToggle={() => setVisible((current) => !current)}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-6 w-full rounded-2xl bg-highlight px-4 py-4 font-semibold text-black transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Signing in..." : "Login"}
          </button>

          <p className="mt-6 text-sm text-zinc-400">
            Need an account?{" "}
            <Link to="/register" className="font-semibold text-highlight">
              Register
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
