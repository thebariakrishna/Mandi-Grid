/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F1EEE2",
        panel: "#FFFFFF",
        ink: {
          DEFAULT: "#20241D",
          soft: "#565143",
          faint: "#8C8672",
        },
        line: "#DAD3BE",
        grain: {
          green: "#3D6B4C",
          greenDark: "#2A4B36",
          gold: "#C0932F",
          goldSoft: "#EAD9A8",
          rust: "#A8452F",
          rustSoft: "#F1D8CC",
        },
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'IBM Plex Sans'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
      borderRadius: {
        sm: "4px",
        md: "6px",
        lg: "10px",
      },
    },
  },
  plugins: [],
};
