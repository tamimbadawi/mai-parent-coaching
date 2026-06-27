/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ivory: '#FDFBF7',
        cream: '#F5F0E8',
        beige: '#E8E0D5',
        sand: '#D4C8B8',
        sage: '#9CAF88',
        'sage-light': '#B8C9A9',
        'sage-dark': '#7A8F6A',
        olive: '#8B9A6B',
        'olive-light': '#A8B88A',
        'dusty-blue': '#8FA3B8',
        'dusty-blue-light': '#B0C4D4',
        'dusty-blue-dark': '#6E8498',
        terracotta: '#C4956A',
        'terracotta-light': '#D4B08A',
        'terracotta-dark': '#A67B52',
        charcoal: '#3D3D3D',
        'warm-gray': '#6B6560',
        'soft-gray': '#A39E99',
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.8s ease-out forwards',
        'slide-up': 'slideUp 0.8s ease-out forwards',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
}
