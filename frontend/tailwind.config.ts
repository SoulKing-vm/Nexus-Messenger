import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#121417",
        paper: "#f8faf9",
        moss: "#4d7c59",
        coral: "#e65f5c",
        lagoon: "#157a8c"
      },
      boxShadow: {
        soft: "0 18px 45px rgba(18, 20, 23, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
