import {
  CalendarDays,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  MoonStar,
  PanelsTopLeft,
  Users
} from "lucide-react";

const items = [
  { label: "Dashboard", icon: LayoutDashboard, active: true },
  { label: "Modules", icon: PanelsTopLeft },
  { label: "Calendar", icon: CalendarDays },
  { label: "Projects", icon: FolderKanban },
  { label: "Community", icon: Users },
  { label: "Messages", icon: MessageSquare }
];

export default function Sidebar({ onLogout, darkMode, onToggleDarkMode }) {
  return (
    <aside className="flex h-full flex-col rounded-[28px] border border-white/10 bg-[#111111] p-5 shadow-glow">
      <div className="mb-8 flex items-center gap-3">
        <div className="grid grid-cols-4 gap-1 rounded-xl border border-white/10 bg-black px-2 py-1">
          {["E", "D", "I", "T"].map((letter) => (
            <span
              key={letter}
              className="flex h-8 w-8 items-center justify-center rounded-md bg-zinc-900 font-display text-sm tracking-[0.28em] text-white"
            >
              {letter}
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="mb-3 px-3 text-xs uppercase tracking-[0.3em] text-zinc-500">Menu</p>
        {items.map(({ label, icon: Icon, active }) => (
          <button
            key={label}
            className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm transition ${
              active
                ? "bg-highlight text-black"
                : "text-zinc-300 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Icon size={18} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      <div className="mt-auto space-y-3">
        <button
          type="button"
          onClick={onToggleDarkMode}
          className="flex w-full items-center justify-between rounded-2xl border border-white/10 px-4 py-3 text-sm text-zinc-200"
        >
          <span className="flex items-center gap-3">
            <MoonStar size={18} />
            Dark Mode
          </span>
          <span
            className={`relative inline-flex h-6 w-12 items-center rounded-full transition ${
              darkMode ? "bg-highlight" : "bg-zinc-700"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 rounded-full bg-black transition ${
                darkMode ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </span>
        </button>

        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-2xl border border-white/10 px-4 py-3 text-sm text-zinc-300 transition hover:bg-white/5 hover:text-white"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  );
}
