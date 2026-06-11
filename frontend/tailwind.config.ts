import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#121417",
        paper: "#f8faf9",
        moss: "#4d7c59",
        coral: "#e65f5c",
        lagoon: "#157a8c",
        teleBlue: "#2AABEE",
        teleDarkBg: "#17212B",
        teleDarkPaper: "#0E1621",
        teleBubble: "#2B5278",
      },
      boxShadow: {
        soft: "0 18px 45px rgba(18, 20, 23, 0.12)",
        tele3d: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255,255,255,0.1)",
      }
    }
  },
  plugins: []
};

export default config;
