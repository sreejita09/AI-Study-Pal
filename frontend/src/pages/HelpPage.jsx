import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronDown,
  HelpCircle,
  Mail,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import api from "../lib/api";

/* ─── FAQ data ───────────────────────────────────────────────────────── */
const FAQS = [
  {
    category: "Notes & Summaries",
    items: [
      {
        q: "How do I generate notes or a summary?",
        a: "Upload a file (PDF, Word, TXT, or PPT) or paste text directly into the workspace. Once your material is loaded, click 'Summarise' or 'Generate Notes' in the study panel. The AI will produce structured content tailored to your learning profile.",
      },
      {
        q: "What file types are supported?",
        a: "PDF, DOCX, TXT, and PPTX files up to 10 MB. You can also paste raw text directly into the text input on the dashboard.",
      },
      {
        q: "My summary looks too short / too long — what can I do?",
        a: "Use the detail level toggle (Brief / Detailed) in the study panel before generating. Detailed mode produces notes approximately 5× longer with examples and explanations.",
      },
    ],
  },
  {
    category: "Quizzes",
    items: [
      {
        q: "How do quizzes work?",
        a: "After uploading material, select 'Quiz' mode. The AI generates multiple-choice questions from your content. Your answers are scored in real time, and weak topics are tracked to personalise future sessions.",
      },
      {
        q: "Can I retake a quiz?",
        a: "Yes — click 'New Quiz' in the study panel to regenerate a fresh set of questions from the same material.",
      },
      {
        q: "Why are some quiz options marked as placeholders?",
        a: "If the AI produces incomplete options, the system automatically retries once. If it persists, try with a shorter text selection (under 8 000 words).",
      },
    ],
  },
  {
    category: "Study Plans",
    items: [
      {
        q: "How are study plans generated?",
        a: "Go to the Plans tab in the sidebar and click 'Generate Plan'. The AI analyses your uploaded materials, identified weak topics, and available time to build a day-by-day schedule.",
      },
      {
        q: "Can I edit a generated study plan?",
        a: "Currently plans are view-only. You can delete a plan and regenerate one with different parameters. Manual editing is on the roadmap.",
      },
    ],
  },
  {
    category: "File Uploads",
    items: [
      {
        q: "My file upload fails — what should I check?",
        a: "Ensure the file is under 10 MB and is a supported type (PDF, DOCX, TXT, PPTX). Avoid files with passwords or heavy DRM. If the problem persists, try pasting the text manually instead.",
      },
      {
        q: "Where are my uploaded files stored?",
        a: "Files are stored securely on the server and linked to your account. They are accessible from the Materials panel in your sidebar across sessions.",
      },
    ],
  },
  {
    category: "Account & Login",
    items: [
      {
        q: "I didn't receive a verification email.",
        a: "Check your spam/junk folder. You can request a new verification link from the login page using the 'Resend verification' option. Make sure your email address was entered correctly at registration.",
      },
      {
        q: "How do I reset my password?",
        a: "Go to Profile & Settings from the sidebar. Under the Security section you can change your password. If you're locked out entirely, contact support below.",
      },
      {
        q: "How do I delete my account?",
        a: "Go to Profile & Settings → scroll to the Danger Zone → click 'Delete Account'. This action is permanent and removes all your data.",
      },
    ],
  },
];

const SUBJECTS = ["Bug", "Feature Request", "Account Issue", "Other"];

/* ─── Accordion item ─────────────────────────────────────────────────── */
function AccordionItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[var(--border-color)] last:border-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-4 py-4 text-left text-sm font-medium text-[var(--text-primary)] transition hover:text-[var(--accent)]"
      >
        <span>{q}</span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-[var(--text-muted)] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <p className="pb-4 text-sm leading-relaxed text-[var(--text-muted)]">{a}</p>
      )}
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────────────── */
export default function HelpPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: SUBJECTS[0],
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // "success" | "error"
  const [errorMsg, setErrorMsg] = useState("");

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setStatus(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    setErrorMsg("");

    try {
      await api.post("/support/contact", form);
      setStatus("success");
      setForm({ name: "", email: "", subject: SUBJECTS[0], message: "" });
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.errors
          ? Object.values(err.response.data.errors).flat().join(" ")
          : "Something went wrong. Please try again.";
      setErrorMsg(msg);
      setStatus("error");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none transition focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]";

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-3xl px-4 py-10">

        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate("/dashboard")}
            className="mb-4 flex items-center gap-1.5 text-sm text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
          >
            <ArrowLeft size={15} />
            Back to Dashboard
          </button>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)]/15">
              <HelpCircle size={20} className="text-[var(--accent)]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Help &amp; Support</h1>
              <p className="text-sm text-[var(--text-muted)]">
                Find answers or contact our team
              </p>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <section className="mb-10">
          <h2 className="mb-5 text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {FAQS.map(({ category, items }) => (
              <div
                key={category}
                className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-6"
              >
                <p className="border-b border-[var(--border-color)] py-3 text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">
                  {category}
                </p>
                {items.map(({ q, a }) => (
                  <AccordionItem key={q} q={q} a={a} />
                ))}
              </div>
            ))}
          </div>
        </section>

        {/* Contact form */}
        <section>
          <h2 className="mb-5 text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">
            Contact Support
          </h2>
          <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6">
            <div className="mb-5 flex items-center gap-2">
              <Mail size={16} className="text-[var(--accent)]" />
              <p className="text-sm text-[var(--text-muted)]">
                We aim to respond within 24 hours.
              </p>
            </div>

            {/* Success banner */}
            {status === "success" && (
              <div className="mb-5 flex items-start gap-3 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
                <CheckCircle size={16} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">Message sent!</p>
                  <p className="text-green-400/80">
                    We received your request and will get back to you shortly.
                  </p>
                </div>
              </div>
            )}

            {/* Error banner */}
            {status === "error" && (
              <div className="mb-5 flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">Failed to send</p>
                  <p className="text-red-400/80">{errorMsg}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">
                    Name
                  </label>
                  <input
                    name="name"
                    type="text"
                    required
                    placeholder="Your name"
                    value={form.name}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">
                    Email
                  </label>
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">
                  Subject
                </label>
                <select
                  name="subject"
                  value={form.subject}
                  onChange={handleChange}
                  className={inputClass}
                >
                  {SUBJECTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">
                  Message
                </label>
                <textarea
                  name="message"
                  required
                  rows={5}
                  placeholder="Describe your issue or question in detail..."
                  value={form.message}
                  onChange={handleChange}
                  className={`${inputClass} resize-none`}
                />
                <p className="mt-1 text-right text-xs text-[var(--text-muted)]">
                  {form.message.length} / 5000
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-black transition hover:opacity-90 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Sending…
                  </>
                ) : (
                  "Send Message"
                )}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
