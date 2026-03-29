import { createContext, useContext, useEffect, useState } from "react";

export const ACCENT_COLORS = [
  { hex: "#3B82F6", label: "Blue" },
  { hex: "#14B8A6", label: "Teal" },
  { hex: "#22C55E", label: "Green" },
  { hex: "#A855F7", label: "Purple" },
  { hex: "#E11D48", label: "Pink" },
  { hex: "#F97316", label: "Orange" },
  { hex: "#EF4444", label: "Red" },
  { hex: "#6366F1", label: "Indigo" },
  { hex: "#84CC16", label: "Lime" },
];

const LS_THEME  = "sp_theme";
const LS_ACCENT = "sp_accent";
const DEFAULT_ACCENT = "#3B82F6";

export const ThemeContext = createContext(null);

/* ── Accent token helpers ── */
function hexToRgb(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

function lightenHex(hex, amount = 0.3) {
  const { r, g, b } = hexToRgb(hex);
  const rL = Math.round(r + (255 - r) * amount);
  const gL = Math.round(g + (255 - g) * amount);
  const bL = Math.round(b + (255 - b) * amount);
  return `#${rL.toString(16).padStart(2, "0")}${gL.toString(16).padStart(2, "0")}${bL.toString(16).padStart(2, "0")}`;
}

function applyAccentTokens(root, hex, theme) {
  const { r, g, b } = hexToRgb(hex);
  const accentLight = lightenHex(hex, 0.3);
  root.style.setProperty("--accent-base",   hex);
  root.style.setProperty("--accent-r",       r);
  root.style.setProperty("--accent-g",       g);
  root.style.setProperty("--accent-b",       b);
  root.style.setProperty("--accent-soft",   `rgba(${r}, ${g}, ${b}, 0.15)`);
  root.style.setProperty("--accent-dim",    `rgba(${r}, ${g}, ${b}, 0.12)`);
  root.style.setProperty("--accent-faint",  `rgba(${r}, ${g}, ${b}, 0.06)`);
  root.style.setProperty("--accent-border", `rgba(${r}, ${g}, ${b}, 0.40)`);
  root.style.setProperty("--accent-light",   accentLight);
  // Adaptive: use lighter shade in light mode for readability against white BG
  root.style.setProperty("--accent", theme === "light" ? accentLight : hex);
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem(LS_THEME) || "dark");
  const [accentColor, setAccentColorState] = useState(() => {
    const saved = localStorage.getItem(LS_ACCENT);
    // Migrate old yellow default → blue
    if (!saved || saved === "#FACC15") return DEFAULT_ACCENT;
    return saved;
  });

  // Apply theme class + data-theme + all CSS variables to <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.remove("dark");
      root.classList.add("light");
    }
    root.setAttribute("data-theme", theme);
    applyAccentTokens(root, accentColor, theme);
  }, [theme, accentColor]);

  function toggleTheme() {
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      localStorage.setItem(LS_THEME, next);
      return next;
    });
  }

  function setAccentColor(hex) {
    localStorage.setItem(LS_ACCENT, hex);
    setAccentColorState(hex);
    // Immediate DOM update for snappy color feedback
    applyAccentTokens(document.documentElement, hex, theme);
  }

  return (
    <ThemeContext.Provider value={{ theme, accentColor, toggleTheme, setAccentColor }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
