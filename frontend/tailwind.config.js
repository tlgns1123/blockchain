/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Inverted gray scale for dark theme
        gray: {
          50:  "#0d0d17",
          100: "#13131f",
          200: "#1c1c2c",
          300: "#2c2c42",
          400: "#565670",
          500: "#7878a0",
          600: "#a0a0bc",
          700: "#c0c0d8",
          800: "#dcdcee",
          900: "#f0f0f8",
        },
        brand: {
          50:  "#120e28",
          100: "#1e1840",
          200: "#2e2468",
          300: "#5040c8",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#c4b5fd",
          700: "#ede9fe",
          900: "#f5f3ff",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system", "BlinkMacSystemFont", "Segoe UI",
          "Pretendard", "sans-serif",
        ],
      },
      boxShadow: {
        "glow-sm":  "0 0 15px rgba(139,92,246,0.2)",
        "glow":     "0 0 30px rgba(139,92,246,0.3)",
        "glow-lg":  "0 0 60px rgba(139,92,246,0.4)",
        "glow-xl":  "0 0 80px rgba(139,92,246,0.5)",
      },
      animation: {
        "gradient-x": "gradient-x 8s ease infinite",
        "float":      "float 6s ease-in-out infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
      },
      keyframes: {
        "gradient-x": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%":      { backgroundPosition: "100% 50%" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":      { transform: "translateY(-12px)" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(139,92,246,0.3)" },
          "50%":      { boxShadow: "0 0 40px rgba(139,92,246,0.6)" },
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":  "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};
