/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        feedloop: {
          primary: '#2563EB',
          'primary-hover': '#1D4ED8',
          'primary-light': '#EFF6FF',
          secondary: '#6B7280',
          'secondary-light': '#F3F4F6',
          tertiary: '#F9FAFB',
          background: '#F9FAFB',
          surface: '#FFFFFF',
          success: '#16A34A',
          'success-light': '#F0FDF4',
          warning: '#D97706',
          'warning-light': '#FFFBEB',
          error: '#DC2626',
          'error-light': '#FEF2F2',
          info: '#2563EB',
          border: '#E5E7EB',
        },
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          900: '#1e3a8a',
        },
        accent: {
          cyan: '#0284c7',
          emerald: '#16a34a',
          amber: '#d97706',
          rose: '#dc2626',
          violet: '#7c3aed',
        }
      },
      fontFamily: {
        sans: ['Kanit', 'sans-serif'],
      },
      fontWeight: {
        hairline: '100',
        thin: '200',
        light: '300',
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '600',
        extrabold: '600',
        black: '700',
      },
      animation: {
        'shimmer': 'shimmer 1.8s linear infinite',
        'fade-in-up': 'fadeInUp 0.25s ease-out both',
        'fade-in': 'fadeIn 0.18s ease-out both',
        'scale-in': 'scaleIn 0.22s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'slide-down': 'slideDown 0.2s ease-out both',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95) translateY(-6px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
