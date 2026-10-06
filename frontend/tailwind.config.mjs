/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          red: '#C8102E',
          'red-light': '#E8203F',
          'red-dark': '#8B0F24',
        },
        gold: {
          DEFAULT: '#A87C1F',
          accent: '#C89A3F',
          soft: '#F1E4C6',
        },
        paper: {
          DEFAULT: '#FAF8F6',
          card: '#FFFFFF',
        },
        ink: {
          DEFAULT: '#211C1A',
          soft: '#6B6560',
          faint: '#9C948C',
        },
        line: '#E9E3DC',
        admin: {
          bg: '#241014',
          'bg-2': '#331720',
          soft: '#C9BDBB',
        },
        state: {
          green: '#16743F',
          'green-soft': '#E4F3EA',
          amber: '#B4720F',
          'amber-soft': '#FBEBD3',
          crimson: '#A23B34',
          'crimson-soft': '#F7E4E1',
        },
      },
      fontFamily: {
        sans: ['var(--font-manrope)', 'Manrope', 'system-ui', 'sans-serif'],
        display: ['var(--font-playfair)', 'Playfair Display', 'Georgia', 'serif'],
      },
      boxShadow: {
        'red-glow': '0 8px 20px -8px rgba(200, 16, 46, 0.5)',
        'red-glow-sm': '0 6px 16px -8px rgba(200, 16, 46, 0.5)',
        card: '0 1px 3px rgba(33, 28, 26, 0.06)',
        'card-hover': '0 20px 50px -30px rgba(33, 28, 26, 0.25)',
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #E8203F 0%, #8B0F24 100%)',
        'gradient-admin': 'linear-gradient(160deg, #3A0812 0%, #8B0F24 45%, #E8203F 100%)',
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.5rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
