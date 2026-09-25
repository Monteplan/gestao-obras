/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#004171",
          foreground: "#ffffff",
          50: '#f0f7fc',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#38bdf8',
          500: '#0284c7',
          600: '#004171', // Azul Corporativo Oficial Monteplan
          700: '#003359',
          800: '#082436', // Azul Marinho Profundo Site
          900: '#0d1721', // Dark Navy Fundo
          950: '#060d14',
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "#38bdf8",
          foreground: "#ffffff",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        monteplan: {
          blue: '#004171',
          blueHover: '#0a548c',
          blueLight: '#38bdf8',
          blueGlow: '#0284c7',
          navy: '#082436',
          darkBg: '#081d2c',
          darkSurface: '#0c2336',
          darkCard: '#102d45',
          darkBorder: '#1c3e5c',
          gold: '#c59042',
        }
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
}
