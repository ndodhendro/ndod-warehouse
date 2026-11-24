/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#101412",
          900: "#161b19",
          800: "#1d2421",
          700: "#27302c",
          600: "#36413c",
        },
        mist: {
          100: "#e8eee9",
          300: "#c5cfc8",
          500: "#8e9a93",
        },
        amber: {
          300: "#ff7d66",
          400: "#f56a4e",
          500: "#EE4D2D",
        },
        teal: {
          300: "#8ee0cb",
          400: "#5ed4b6",
          500: "#2eae93",
        },
        clay: {
          400: "#ef8b84",
        },
        lilac: {
          300: "#d7c4f5",
          400: "#b794e6",
        },
      },
      fontFamily: {
        sans: ["Manrope", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "inset 0 1px 0 rgba(255,255,255,0.04), 0 16px 40px rgba(0,0,0,0.28)",
      },
    },
  },
  plugins: [],
}
