import { useRef, useState } from "react";
import { Upload, FileText, Loader2, AlignLeft, StickyNote, HelpCircle, Trash2, X, Check } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

export default function UploadBar({
  onUpload,
  onAction,
  onDeleteFile,
  onRemoveFile,
  files = [],
  uploading,
  aiLoading,
  activeFeature,
  onFeatureChange,
  results = {},
  noteType = "quick",
  onNoteTypeChange,
}) {
  const fileRef = useRef();
  const [showModal, setShowModal] = useState(false);
  const { accentColor } = useTheme();

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (file && onUpload) onUpload(file);
    e.target.value = "";
  };

  const confirmDelete = () => {
    onDeleteFile?.();
    setShowModal(false);
  };

  const hasFiles = files.length > 0;

  // When no files, let Workspace empty state handle the upload experience
  if (!hasFiles && !uploading) return null;

  return (
    <>
      <div className="flex flex-col gap-4">
        {/* Upload Section */}
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4">
          <input ref={fileRef} type="file" accept=".pdf,.txt,.doc,.docx,.ppt,.pptx" onChange={handleFile} className="hidden" />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 rounded-lg border border-dashed px-4 py-2 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              borderColor: accentColor + '66',
              backgroundColor: accentColor + '1a',
              color: accentColor,
            }}
          >
            {uploading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Upload size={16} />
            )}
            {uploading ? "Uploading..." : hasFiles ? "Add another file" : "Upload PDF or Text file"}
          </button>
        </div>

        {/* Multi-File Chips */}
        {hasFiles && (
          <div className="flex flex-wrap items-center gap-2">
            {files.map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-1.5"
              >
                <FileText size={14} className="text-[var(--accent)]" />
                <span className="text-sm font-medium text-[var(--text-primary)] max-w-[160px] truncate">{f.name}</span>
                <span className="rounded bg-[var(--bg-hover)] px-1.5 py-0.5 text-[10px] uppercase text-[var(--text-muted)]">
                  {f.name.split(".").pop()}
                </span>
                <button
                  onClick={() => onRemoveFile?.(i)}
                  className="rounded p-0.5 text-zinc-500 transition hover:bg-red-500/10 hover:text-red-400"
                  title="Remove file"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            {files.length > 1 && (
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-red-400 transition hover:bg-red-500/10"
                title="Remove all files"
              >
                <Trash2 size={12} />
                Clear all
              </button>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-4">
          {[
            { label: "Summary", icon: AlignLeft, key: "summary" },
            { label: "Notes", icon: StickyNote, key: "notes" },
            { label: "Quiz", icon: HelpCircle, key: "quiz" }
          ].map(({ label, icon: Icon, key }) => {
            const isSelected = activeFeature === key;
            const isLoading = aiLoading === key;
            const disabled = !!aiLoading || !hasFiles;
            // Check if result is cached
            const cacheKey = key === "notes"
              ? (noteType === "detailed" ? "notesDetailed" : "notes")
              : key;
            const hasCached = !!results[cacheKey];
            return (
              <button
                key={label}
                onClick={() => {
                  onFeatureChange?.(key);
                  onAction(key);
                }}
                disabled={disabled || isLoading}
                className={[
                  "relative flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-black",
                  "transition-all duration-200 active:scale-95",
                  disabled ? "opacity-50 cursor-not-allowed" : "hover:brightness-105",
                  isSelected ? "scale-105" : "",
                ].join(" ")}
                style={{
                  backgroundColor: accentColor,
                  filter: isSelected ? 'brightness(1.1)' : undefined,
                  boxShadow: isSelected ? `0 0 14px ${accentColor}55` : undefined,
                }}
              >
                {isLoading ? (
                  <Loader2 size={isSelected ? 16 : 14} className="animate-spin" />
                ) : (
                  <Icon size={isSelected ? 16 : 14} className={isSelected ? "opacity-100" : "opacity-70"} />
                )}
                {label}
                {hasCached && !isLoading && (
                  <Check size={12} className="text-green-700 opacity-70" />
                )}
              </button>
            );
          })}
        </div>

        {/* Notes Detail Toggle */}
        {activeFeature === "notes" && hasFiles && (
          <div className="flex items-center justify-center gap-2">
            {["quick", "detailed"].map((type) => (
              <button
                key={type}
                onClick={() => {
                  onNoteTypeChange?.(type);
                  // Auto-generate if not cached
                  const nk = type === "detailed" ? "notesDetailed" : "notes";
                  if (!results[nk]) onAction("notes");
                }}
                className={[
                  "rounded-lg px-4 py-1.5 text-xs font-semibold transition-all duration-150",
                  noteType === type
                    ? "border"
                    : "bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border-color)] hover:text-[var(--text-primary)] hover:border-[var(--text-faint)]"
                ].join(" ")}
                style={noteType === type ? {
                  backgroundColor: accentColor + '22',
                  color: accentColor,
                  borderColor: accentColor + '66',
                } : {}}
              >
                {type === "quick" ? "Quick Notes" : "Detailed Notes"}
                {results[type === "detailed" ? "notesDetailed" : "notes"] && (
                  <Check size={10} className="inline ml-1 text-green-400 opacity-70" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Mode Label */}
        <p className="text-center text-xs text-[var(--text-muted)]">
          Mode:{" "}
          <span className="font-semibold capitalize text-[var(--accent)]">
            {activeFeature}{activeFeature === "notes" ? ` (${noteType})` : ""}
          </span>
        </p>

        {/* Divider */}
        <div className="border-t border-[var(--border-color)]" />
      </div>

      {/* Delete Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Delete all files?</h3>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              This will remove all uploaded files and clear cached results.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg border border-[var(--border-color)] px-4 py-2 text-sm text-[var(--text-muted)] transition hover:bg-[var(--bg-surface)]"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
