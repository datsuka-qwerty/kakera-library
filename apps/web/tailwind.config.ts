import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Light theme: warm ivory tones
        surface: {
          light: "#F5F0E8",   // ivory background
          DEFAULT: "#EDE8DC", // slightly darker ivory
          dark: "#1E2023",    // dark gray background
        },
        // Dark theme: deep gray tones
        "surface-elevated": {
          light: "#FDFAF4",
          dark: "#2A2D31",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
