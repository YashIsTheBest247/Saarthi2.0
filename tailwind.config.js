/** @type {import('tailwindcss').Config} */
// Neutral tokens are driven by CSS variables (RGB channels) so the whole app can
// flip between light and dark via a `.dark` class on <html>. See src/index.css.
const withA = (v) => `rgb(var(${v}) / <alpha-value>)`;

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: withA("--c-paper"),
        canvas: withA("--c-canvas"), // page background
        linen: withA("--c-linen"), // near-white surface; also used as text-on-dark (kept light)
        mist: withA("--c-mist"), // neutral chips / inputs
        panel: withA("--c-panel"), // muted section background
        ink: withA("--c-ink"), // near-black — dark surfaces/buttons (stays dark in both themes)
        graphite: withA("--c-graphite"),
        muted: withA("--c-muted"),
        faint: withA("--c-faint"),
        line: withA("--c-line"),
        lineSoft: withA("--c-lineSoft"),

        // warm terracotta accent (used sparingly)
        clay: {
          DEFAULT: "#B5613B",
          50: "#F3E7DF",
          100: "#E8D2C4",
          300: "#D8A98C",
          500: "#B5613B",
          600: "#9A4F2E",
          700: "#7E4126",
        },

        // states
        verdant: "#2E6F52",
        amber2: "#B07A1E",
        danger: "#B23A2E",
      },
      fontFamily: {
        display: ['"Familjen Grotesk"', '"Hanken Grotesk"', "system-ui", "sans-serif"],
        sans: ['"Hanken Grotesk"', '"Noto Sans Devanagari"', "system-ui", "sans-serif"],
        deva: ['"Hanken Grotesk"', '"Noto Sans Devanagari"', "sans-serif"],
      },
      borderRadius: {
        xl2: "1.25rem",
        "3xl": "1.75rem",
        "4xl": "2.25rem",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(26,23,20,0.04), 0 6px 20px -10px rgba(26,23,20,0.10)",
        card: "0 2px 6px rgba(26,23,20,0.04), 0 18px 44px -24px rgba(26,23,20,0.18)",
        float: "0 12px 30px -10px rgba(26,23,20,0.14), 0 30px 70px -40px rgba(26,23,20,0.22)",
        chip: "0 6px 18px -8px rgba(26,23,20,0.20)",
        pill: "0 6px 24px -8px rgba(26,23,20,0.12)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-9px)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.7s cubic-bezier(0.22,1,0.36,1) both",
        float: "float 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
