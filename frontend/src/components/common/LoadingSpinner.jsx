export default function LoadingSpinner({ label = "Loading workspace..." }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink text-white">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-highlight" />
        <p className="text-sm text-zinc-400">{label}</p>
      </div>
    </div>
  );
}
