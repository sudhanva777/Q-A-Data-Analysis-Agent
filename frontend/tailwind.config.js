/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6', // Primary Accent
          600: '#2563EB', // Primary Hover
          700: '#1D4ED8',
          800: '#1E40AF', // Secondary Dark Blue
          900: '#1E3A8A',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#F8FAFC',
          card: '#FFFFFF',
          gray: '#F1F5F9',
        },
        border: {
          DEFAULT: '#E2E8F0',
          light: '#F1F5F9',
          dark: '#CBD5E1',
        },
        text: {
          primary: '#1F2937',
          secondary: '#4B5563',
          muted: '#9CA3AF',
        },
        status: {
          success: '#10B981',
          'success-bg': '#ECFDF5',
          'success-border': '#A7F3D0',
          warning: '#F59E0B',
          'warning-bg': '#FFFBEB',
          'warning-border': '#FDE68A',
          error: '#EF4444',
          'error-bg': '#FEF2F2',
          'error-border': '#FCA5A5',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['Fira Code', 'Consolas', 'Monaco', 'monospace'],
      },
      boxShadow: {
        'xs': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'sm': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
      },
      borderRadius: {
        'md': '6px',
        'lg': '8px',
        'xl': '12px',
        '2xl': '16px',
      }
    },
  },
  plugins: [],
}

