/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#080808",
        panel: "#141414",
        surface: "#1a1a1a",
        line: "#2a2a2a",
        highlight: "#facc15",
        accent: "#f97316",
        muted: "#9ca3af"
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "sans-serif"],
        display: ["Space Grotesk", "sans-serif"]
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(250, 204, 21, 0.16), 0 24px 60px rgba(0, 0, 0, 0.45)"
      },
      backgroundImage: {
        "hero-grid":
          "radial-gradient(circle at top left, rgba(250, 204, 21, 0.16), transparent 28%), radial-gradient(circle at top right, rgba(255,255,255,0.08), transparent 18%)"
      }
    }
  },
  plugins: [require("@tailwindcss/typography")]
};
