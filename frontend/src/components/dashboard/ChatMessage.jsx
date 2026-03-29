import { useState } from "react";
import { Check, Copy } from "lucide-react";
import ReactMarkdown from "react-markdown";
import QuizPlayer from "./QuizPlayer";

export default function ChatMessage({ role = "ai", title, content, type }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = typeof content === "string" ? content : JSON.stringify(content, null, 2);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1000);
  };

  const rawText = typeof content === "string" ? content : JSON.stringify(content, null, 2);

  // Parse quiz data — could be array or JSON string
  let quizData = null;
  if (type === "quiz") {
    if (Array.isArray(content)) {
      quizData = content;
    } else if (typeof content === "string") {
      try {
        const cleaned = content.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed)) quizData = parsed;
      } catch {
        // not JSON, will render as markdown
      }
    }
  }

  return (
    <div className="group relative rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 transition-all">
      {/* Copy button — hide for interactive quiz */}
      {!quizData && (
        <button
          onClick={handleCopy}
          className="absolute right-4 top-4 z-10 flex items-center gap-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs opacity-0 transition-all hover:border-[var(--accent)] group-hover:opacity-100"
        >
          {copied ? (
            <><Check size={13} className="text-green-400" /><span className="text-green-400">Copied!</span></>
          ) : (
            <><Copy size={13} className="text-[var(--text-muted)]" /><span className="text-[var(--text-muted)]">Copy</span></>
          )}</button>
      )}

      {title && (
        <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">
          {title}
        </p>
      )}

      {quizData ? (
        <QuizPlayer questions={quizData} />
      ) : (
        <div className="prose prose-invert max-w-none space-y-4 prose-headings:text-lg prose-headings:font-semibold prose-headings:text-[var(--accent)] prose-p:text-[var(--text-primary)] prose-p:leading-relaxed prose-strong:text-[var(--accent)] prose-li:text-[var(--text-primary)] prose-li:leading-relaxed prose-ul:space-y-1 prose-ol:space-y-1">
          <ReactMarkdown>{rawText}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}
