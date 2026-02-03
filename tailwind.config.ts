import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./node_modules/streamdown/dist/*.js",
  ],
  theme: {
    extend: {
      screens: {
        desktop: "1085px",
      },
    },
  },
  plugins: [],
};

export default config;
