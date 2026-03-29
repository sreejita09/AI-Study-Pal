import { Eye, EyeOff } from "lucide-react";

export default function PasswordField({
  label,
  value,
  onChange,
  placeholder,
  visible,
  onToggle
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm text-zinc-300">{label}</span>
      <div className="flex items-center rounded-2xl border border-white/10 bg-white/5 px-4">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full bg-transparent py-4 text-white outline-none placeholder:text-zinc-500"
        />
        <button
          type="button"
          onClick={onToggle}
          className="text-zinc-400 transition hover:text-white"
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </label>
  );
}
