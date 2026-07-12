import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        saffron: {
          50:  '#fdf9e7',
          100: '#faf0c0',
          200: '#f7e08a',
          300: '#f4c430',   // primary saffron
          400: '#e8b020',
          500: '#d49c12',
          600: '#b07e0a',
          700: '#8a5f07',
          800: '#634305',
          900: '#3d2903',
        },
        sandstone: {
          50:  '#faf7f3',
          100: '#f5ede4',
          200: '#ead9c5',
          300: '#d2b48c',   // sandstone
          400: '#c09866',
          500: '#a87c45',
          600: '#8a6234',
          700: '#6b4a25',
          800: '#4d3419',
          900: '#2e1f0f',
        },
        twilight: {
          50:  '#e8e9f5',
          100: '#c5c8e8',
          200: '#9da2d6',
          300: '#7479c4',
          400: '#4f55b5',
          500: '#2d33a3',
          600: '#191970',   // deep twilight blue (midnight blue)
          700: '#131458',
          800: '#0d0e40',
          900: '#070828',
        },
        cream: {
          50:  '#fefef8',
          100: '#fdfbee',
          200: '#fbf5d6',
          DEFAULT: '#fdf6e3',  // warm off-white
        }
      },
      fontFamily: {
        serif: ['Merriweather', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Playfair Display', 'Georgia', 'serif'],
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'tap-press': 'tap-press 0.15s ease-out',
        'spin-slow': 'spin 20s linear infinite',
        'fade-in': 'fadeIn 0.6s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        glow: {
          from: { boxShadow: '0 0 10px rgba(244, 196, 48, 0.4), 0 0 20px rgba(244, 196, 48, 0.2)' },
          to:   { boxShadow: '0 0 25px rgba(244, 196, 48, 0.8), 0 0 50px rgba(244, 196, 48, 0.4)' },
        },
        'tap-press': {
          '0%':   { transform: 'scale(1)' },
          '50%':  { transform: 'scale(0.96)' },
          '100%': { transform: 'scale(1)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(135deg, #191970 0%, #2d1b69 30%, #1a0a3e 60%, #0d0a2e 100%)',
        'saffron-gradient': 'linear-gradient(135deg, #F4C430 0%, #e8a820 50%, #d49012 100%)',
        'card-gradient': 'linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'saffron': '0 4px 20px rgba(244, 196, 48, 0.3)',
        'saffron-lg': '0 8px 40px rgba(244, 196, 48, 0.5)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.3)',
        'card': '0 4px 24px rgba(0, 0, 0, 0.15)',
        'inner-glow': 'inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      },
    },
  },
  plugins: [],
}

export default config
