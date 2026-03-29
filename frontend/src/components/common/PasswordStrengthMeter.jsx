const levels = [
  { min: 0, label: "Weak", color: "bg-rose-500" },
  { min: 3, label: "Medium", color: "bg-amber-400" },
  { min: 5, label: "Strong", color: "bg-emerald-500" }
];

function scorePassword(password) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[\d\W]/.test(password)) score += 1;
  if (password.length >= 12) score += 1;
  return score;
}

export default function PasswordStrengthMeter({ password }) {
  const score = scorePassword(password);
  const activeLevel =
    [...levels].reverse().find((level) => score >= level.min) || levels[0];

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className={`h-2 rounded-full ${
              index < score ? activeLevel.color : "bg-white/10"
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-zinc-400">
        Strength: <span className="font-semibold text-white">{activeLevel.label}</span>
      </p>
    </div>
  );
}
