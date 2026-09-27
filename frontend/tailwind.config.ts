import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Georgia", "serif"],
        sans: ["Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
