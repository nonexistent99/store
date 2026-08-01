import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0b1012",
        panel: "#11191b",
        mint: "#b8f15d",
        mist: "#e9ece6",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(184,241,93,.14), 0 18px 48px rgba(0,0,0,.28)",
      },
      fontFamily: {
        display: ["Arial Black", "Arial", "sans-serif"],
        body: ["Arial", "Helvetica", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
