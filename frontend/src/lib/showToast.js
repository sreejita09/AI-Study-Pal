import toast from "react-hot-toast";

/**
 * Reusable toast utility with consistent styling.
 * @param {string} message - The message to display
 * @param {"success"|"error"|"info"} type - Toast type
 * @param {object} [opts] - Extra react-hot-toast options
 */
export default function showToast(message, type = "info", opts = {}) {
  const base = { duration: 3000, ...opts };

  switch (type) {
    case "success":
      return toast.success(message, base);
    case "error":
      return toast.error(message, { duration: 4000, ...opts });
    case "info":
      return toast(message, {
        ...base,
        icon: "ℹ️",
        style: { background: "var(--bg-surface)", color: "var(--text-primary)", border: "1px solid var(--border-color)" },
      });
    default:
      return toast(message, base);
  }
}
