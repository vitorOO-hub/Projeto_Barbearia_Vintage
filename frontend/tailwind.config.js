/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#FBF7F1",
        paper: "#FFFFFF",
        ink: "#2E241C",
        "ink-soft": "#6B5A4B",
        "ink-faint": "#9C8B7C",
        line: "#E4D9C9",
        brass: {
          DEFAULT: "#A3763F",
          soft: "#F1E4CF",
          dark: "#7C5A2F",
        },
        forest: {
          DEFAULT: "#4B6146",
          soft: "#E3EAE0",
          dark: "#374A33",
        },
        brick: {
          DEFAULT: "#AA4132",
          soft: "#F3E0DC",
          dark: "#82301F",
        },
        slate: {
          DEFAULT: "#516C82",
          soft: "#E3EBF0",
          dark: "#3C5265",
        },
      },
      fontFamily: {
        display: ['"Bitter"', "Georgia", "serif"],
        sans: ['"Work Sans"', "system-ui", "-apple-system", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(46, 36, 28, 0.06), 0 1px 3px rgba(46, 36, 28, 0.08)",
        panel: "0 8px 24px rgba(46, 36, 28, 0.16)",
      },
    },
  },
  plugins: [],
};
