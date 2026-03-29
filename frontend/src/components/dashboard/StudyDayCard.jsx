function formatDisplayDate(dateString) {
  if (!dateString) return "No date assigned";

  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) {
    return dateString;
  }

  return parsed.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
}

export default function StudyDayCard({
  day,
  date,
  topics,
  completedTopics = [],
  onToggleTopic
}) {
  const completedCount = topics.filter((topic) =>
    completedTopics.includes(topic)
  ).length;
  const progress = topics.length
    ? Math.round((completedCount / topics.length) * 100)
    : 0;

  return (
    <article className="rounded-xl border border-white/10 bg-black/20 p-5 shadow-lg transition duration-200 hover:-translate-y-1 hover:border-highlight/40 hover:bg-black/30">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-highlight">
            Day {day}
          </p>
          <h3 className="mt-2 text-xl font-semibold text-white">
            Study Session {day}
          </h3>
          <p className="mt-1 text-sm text-zinc-500">{formatDisplayDate(date)}</p>
        </div>

        <div className="min-w-20 rounded-full border border-highlight/20 bg-highlight/10 px-3 py-2 text-right">
          <p className="text-lg font-bold text-highlight">{progress}%</p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
            complete
          </p>
        </div>
      </div>

      <div className="mb-3 h-2 overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full bg-highlight transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <ul className="space-y-3">
        {topics.map((topic) => {
          const checked = completedTopics.includes(topic);

          return (
            <li
              key={`${day}-${topic}`}
              className="flex items-start gap-3 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-3"
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggleTopic(day, topic)}
                className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent text-highlight focus:ring-highlight"
              />
              <span
                className={`text-sm leading-6 ${
                  checked ? "text-zinc-500 line-through" : "text-zinc-200"
                }`}
              >
                {topic}
              </span>
            </li>
          );
        })}
      </ul>
    </article>
  );
}
