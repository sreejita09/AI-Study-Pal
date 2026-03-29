import { Bell, Search } from "lucide-react";

export default function Topbar({ user }) {
  return (
    <div className="mb-6 flex flex-col gap-4 rounded-[28px] border border-white/10 bg-[#101010] p-4 md:flex-row md:items-center md:justify-between">
      <div className="relative max-w-xl flex-1">
        <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
        <input
          placeholder="Search lessons, files, or smart recommendations..."
          className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-white outline-none placeholder:text-zinc-500"
        />
      </div>

      <div className="flex items-center gap-4">
        <button className="relative rounded-2xl border border-white/10 bg-white/5 p-3 text-zinc-300 transition hover:text-white">
          <Bell size={18} />
          <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-highlight" />
        </button>
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-highlight font-bold text-black">
            {user?.username?.slice(0, 1).toUpperCase() || "A"}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{user?.username || "Learner"}</p>
            <p className="text-xs text-zinc-500">{user?.email}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
