import { useRef, useEffect, useState, useCallback } from "react";
import {
  Loader2, RefreshCw, Download, Upload, FileText, Sparkles,
  ThumbsUp, ThumbsDown, Wand2
} from "lucide-react";
import toast from "react-hot-toast";
import ChatMessage from "./ChatMessage";
import Modal from "../common/Modal";

function downloadAsText(content, feature) {
  const text = typeof content === "string" ? content : JSON.stringify(content, null, 2);
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${feature || "output"}_${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

/* Skeleton placeholder while AI is generating */
function SkeletonBlock() {
  return (
    <div className="animate-pulse space-y-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-6">
      <div className="h-3 w-24 rounded bg-[var(--bg-hover)]" />
      <div className="space-y-2">
        <div className="h-3 w-full rounded bg-[var(--bg-hover)]" />
        <div className="h-3 w-5/6 rounded bg-[var(--bg-hover)]" />
        <div className="h-3 w-4/6 rounded bg-[var(--bg-hover)]" />
      </div>
      <div className="space-y-2 pt-2">
        <div className="h-3 w-full rounded bg-[var(--bg-hover)]" />
        <div className="h-3 w-3/4 rounded bg-[var(--bg-hover)]" />
      </div>
    </div>
  );
}

export default function Workspace({
  messages = [],
  activeFeature = "summary",
  aiLoading = "",
  onRegenerate,
  onImprove,
  onUpload,
  onPasteText,
  onTopicGenerate,
  hasFile = false,
  isCached = false,
}) {
  const bottomRef = useRef();
  const scrollContainerRef = useRef();
  const fileInputRef = useRef();
  const [dragging, setDragging] = useState(false);
  const [feedback, setFeedback] = useState(null); // "up" | "down" | null
  const [showFeedbackInput, setShowFeedbackInput] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [pasteModalOpen, setPasteModalOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [topicModalOpen, setTopicModalOpen] = useState(false);
  const [topicText, setTopicText] = useState("");

  // Auto-scroll to bottom on new messages or loading state change
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, aiLoading]);

  // Reset feedback when messages change (new generation)
  useEffect(() => {
    setFeedback(null);
    setShowFeedbackInput(false);
    setFeedbackText("");
  }, [messages]);

  /* ── Drag & Drop handlers ─────────────────────────── */
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer?.items?.length) setDragging(true);
  }, []);

  const handleDragOut = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file && onUpload) onUpload(file);
  }, [onUpload]);

  const handleFileInput = (e) => {
    const file = e.target.files?.[0];
    if (file && onUpload) onUpload(file);
    e.target.value = "";
  };

  const handleFeedback = (type) => {
    setFeedback(type);
    if (type === "down") {
      setShowFeedbackInput(true);
    } else {
      setShowFeedbackInput(false);
      toast.success("Thanks for your feedback!", { id: "feedback", duration: 2000 });
    }
  };

  const submitFeedbackText = () => {
    toast.success("Thanks for your feedback!", { id: "feedback", duration: 2000 });
    setShowFeedbackInput(false);
  };

  const aiMessages = messages.filter((m) => m.role === "ai" && m.title !== "Error");
  const hasOutput = aiMessages.length > 0;
  const latestAiMsg = aiMessages[aiMessages.length - 1];

  /* ── Empty state: no file → show 3 interactive cards ─ */
  if (!hasFile && messages.length === 0 && !aiLoading) {
    return (
      <>
        <div
          onDragEnter={handleDragIn}
          onDragLeave={handleDragOut}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`flex flex-1 flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all duration-200 ${
            dragging
              ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] shadow-lg"
              : "border-[var(--border-color)] bg-[var(--bg-surface)]"
          } px-6 py-20 text-center`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt"
            onChange={handleFileInput}
            className="hidden"
          />

          <div className="mb-6 flex items-center justify-center gap-6">
            {/* Upload File Card */}
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Upload a PDF or text file"
              className="group flex flex-col items-center gap-2 rounded-2xl p-5 transition-all duration-200 cursor-pointer hover:scale-105 bg-[var(--bg-card)] hover:bg-[var(--bg-hover)]"
            >
              <Upload size={28} className="text-blue-400 transition-transform duration-200 group-hover:scale-110" />
              <span className="text-xs font-medium text-blue-400/80">Upload</span>
            </button>

            {/* Paste Text Card */}
            <button
              onClick={() => setPasteModalOpen(true)}
              title="Paste text directly for AI analysis"
              className="group flex flex-col items-center gap-2 rounded-2xl p-5 transition-all duration-200 cursor-pointer hover:scale-105 hover:shadow-[0_0_20px_rgba(96,165,250,0.15)] bg-blue-400/10 hover:bg-blue-400/20"
            >
              <FileText size={28} className="text-blue-400 transition-transform duration-200 group-hover:scale-110" />
              <span className="text-xs font-medium text-blue-400/80">Paste Text</span>
            </button>

            {/* AI Topic Card */}
            <button
              onClick={() => setTopicModalOpen(true)}
              title="Generate study material from a topic name"
              className="group flex flex-col items-center gap-2 rounded-2xl p-5 transition-all duration-200 cursor-pointer hover:scale-105 hover:shadow-[0_0_20px_rgba(192,132,252,0.15)] bg-purple-400/10 hover:bg-purple-400/20"
            >
              <Sparkles size={28} className="text-purple-400 transition-transform duration-200 group-hover:scale-110" />
              <span className="text-xs font-medium text-purple-400/80">AI Topic</span>
            </button>
          </div>

          <h3 className="font-display text-xl font-bold text-[var(--text-primary)]">
            {dragging ? "Drop your file here" : "Get started with AI Study Pal"}
          </h3>
          <p className="mt-2 max-w-sm text-sm text-[var(--text-muted)]">
            {dragging
              ? "Release to upload your PDF or text file"
              : <>
                  Upload a file, paste text, or enter a topic — then press{" "}
                  <kbd className="rounded bg-[var(--bg-card)] px-1.5 py-0.5 text-xs text-[var(--accent)]">S</kbd> Summary,{" "}
                  <kbd className="rounded bg-[var(--bg-card)] px-1.5 py-0.5 text-xs text-[var(--accent)]">N</kbd> Notes, or{" "}
                  <kbd className="rounded bg-[var(--bg-card)] px-1.5 py-0.5 text-xs text-[var(--accent)]">Q</kbd> Quiz
                </>
            }
          </p>
        </div>

        {/* Paste Text Modal */}
        <Modal open={pasteModalOpen} onClose={() => { setPasteModalOpen(false); setPasteText(""); }} title="Paste Your Text">
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="Paste your study material, notes, or any text here..."
            className="w-full h-40 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-faint)] outline-none transition focus:border-[var(--accent)] resize-none"
            autoFocus
          />
          <div className="mt-4 flex justify-end gap-3">
            <button
              onClick={() => { setPasteModalOpen(false); setPasteText(""); }}
              className="rounded-lg border border-[var(--border-color)] px-4 py-2 text-sm text-[var(--text-muted)] transition hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (pasteText.trim().length < 20) {
                  toast.error("Please enter at least 20 characters", { id: "paste-min" });
                  return;
                }
                onPasteText?.(pasteText.trim());
                setPasteModalOpen(false);
                setPasteText("");
              }}
              disabled={pasteText.trim().length < 20}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-black transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              Use Text
            </button>
          </div>
        </Modal>

        {/* AI Topic Modal */}
        <Modal open={topicModalOpen} onClose={() => { setTopicModalOpen(false); setTopicText(""); }} title="Generate from Topic">
          <p className="mb-3 text-sm text-[var(--text-muted)]">Enter a topic and we'll generate comprehensive study material using AI.</p>
          <input
            value={topicText}
            onChange={(e) => setTopicText(e.target.value)}
            placeholder="e.g. Photosynthesis, Newton's Laws, TCP/IP..."
            className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-faint)] outline-none transition focus:border-[var(--accent)]"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && topicText.trim()) {
                onTopicGenerate?.(topicText.trim());
                setTopicModalOpen(false);
                setTopicText("");
              }
            }}
          />
          <div className="mt-4 flex justify-end gap-3">
            <button
              onClick={() => { setTopicModalOpen(false); setTopicText(""); }}
              className="rounded-lg border border-[var(--border-color)] px-4 py-2 text-sm text-[var(--text-muted)] transition hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (!topicText.trim()) return;
                onTopicGenerate?.(topicText.trim());
                setTopicModalOpen(false);
                setTopicText("");
              }}
              disabled={!topicText.trim()}
              className="rounded-lg bg-purple-500 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-purple-400 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Generate
            </button>
          </div>
        </Modal>
      </>
    );
  }

  return (
    <div
      className="flex flex-1 flex-col overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] shadow-sm transition-all"
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      {/* Drag overlay when file exists */}
      {dragging && (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-xl border-2 border-dashed border-[var(--accent)] bg-black/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2">
            <Upload size={32} className="text-[var(--accent)]" />
            <p className="text-sm font-medium text-[var(--accent)]">Drop to replace file</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between border-b border-[var(--border-color)] px-6 py-3">
        <div className="flex items-center gap-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
            AI Workspace
          </p>
          {isCached && !aiLoading && (
            <span className="rounded-full bg-green-500/10 px-2.5 py-0.5 text-[10px] font-medium text-green-400 animate-[fadeIn_0.2s_ease-out]">
              Cached result
            </span>
          )}
          {aiLoading && (
            <span className="rounded-full bg-[var(--bg-hover)] px-2.5 py-0.5 text-[10px] font-medium text-[var(--accent)] animate-pulse">
              Generating…
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Download */}
          {hasOutput && !aiLoading && latestAiMsg && latestAiMsg.type !== "quiz" && (
            <button
              onClick={() => downloadAsText(latestAiMsg.content, activeFeature)}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-1.5 text-xs text-[var(--text-muted)] transition-all duration-150 hover:border-[var(--accent)] hover:text-[var(--accent)] active:scale-95"
            >
              <Download size={12} />
              Download
            </button>
          )}
          {/* Improve Answer */}
          {hasOutput && !aiLoading && latestAiMsg && latestAiMsg.type !== "quiz" && (
            <button
              onClick={onImprove}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-1.5 text-xs text-[var(--text-muted)] transition-all duration-150 hover:border-purple-400/50 hover:text-purple-400 active:scale-95"
            >
              <Wand2 size={12} />
              Improve
            </button>
          )}
          {/* Regenerate */}
          {hasOutput && !aiLoading && (
            <button
              onClick={onRegenerate}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-1.5 text-xs text-[var(--text-muted)] transition-all duration-150 hover:border-[var(--accent)] hover:text-[var(--accent)] active:scale-95"
            >
              <RefreshCw size={12} />
              Regenerate
            </button>
          )}
          <p className="ml-1 text-xs text-[var(--text-muted)]">
            Mode: <span className="font-semibold capitalize text-[var(--accent)]">{activeFeature}</span>
          </p>
        </div>
      </div>
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl space-y-4">
          {messages
            .filter((msg) => msg.role === "ai")
            .map((msg, i) => (
              <div key={i} className="rounded-xl animate-[fadeIn_0.3s_ease-out]">
                <ChatMessage
                  role={msg.role}
                  title={msg.title}
                  content={msg.content}
                  type={msg.type}
                />
              </div>
            ))}

          {/* Skeleton loading */}
          {aiLoading && <SkeletonBlock />}

          {/* Feedback row below output */}
          {hasOutput && !aiLoading && (
            <div className="flex items-center gap-3 animate-[fadeIn_0.3s_ease-out]">
              <span className="text-xs text-[var(--text-faint)]">Was this helpful?</span>
              <button
                onClick={() => handleFeedback("up")}
                className={`rounded-lg p-1.5 transition-all duration-150 active:scale-90 ${
                  feedback === "up"
                    ? "bg-green-500/15 text-green-400"
                    : "text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-green-400"
                }`}
              >
                <ThumbsUp size={14} />
              </button>
              <button
                onClick={() => handleFeedback("down")}
                className={`rounded-lg p-1.5 transition-all duration-150 active:scale-90 ${
                  feedback === "down"
                    ? "bg-red-500/15 text-red-400"
                    : "text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-red-400"
                }`}
              >
                <ThumbsDown size={14} />
              </button>
              {feedback === "up" && (
                <span className="text-xs text-green-500 animate-[fadeIn_0.3s_ease-out]">Thanks!</span>
              )}
            </div>
          )}

          {/* Negative feedback input */}
          {showFeedbackInput && (
            <div className="flex gap-2 animate-[fadeIn_0.3s_ease-out]">
              <input
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="What was wrong?"
                className="flex-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-faint)] outline-none transition focus:border-[var(--accent)]"
                onKeyDown={(e) => { if (e.key === "Enter") submitFeedbackText(); }}
              />
              <button
                onClick={submitFeedbackText}
                className="rounded-lg px-3 py-2 text-xs font-semibold text-black transition-all active:scale-95"
                style={{ backgroundColor: 'var(--accent)' }}
              >
                Send
              </button>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}
