import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        noche: "#0B1437",
        nochedark: "#070D26",
        tinta: "#F4F1E8",
        oro: "#F5C542",
        orobrillante: "#FFD966",
        acierto: "#3DDC97",
        coral: "#FF6B6B",
        azul: "#1E3A8A",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
      },
    },
  },
  plugins: [],
};

export default config;
