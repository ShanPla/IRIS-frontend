/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "var(--app-primary)",
        "primary-strong": "var(--app-primary-strong)",
        foreground: "var(--app-text)",
        muted: "var(--app-text-muted)",
        border: "var(--app-border)",
      },
    },
  },
  plugins: [],
};
