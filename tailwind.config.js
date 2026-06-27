/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ivory: 'rgb(var(--color-ivory))',
        cream: 'rgb(var(--color-cream))',
        beige: 'rgb(var(--color-beige))',
        sand: 'rgb(var(--color-sand))',
        sage: 'rgb(var(--color-sage))',
        'sage-light': 'rgb(var(--color-sage-light))',
        'sage-dark': 'rgb(var(--color-sage-dark))',
        olive: 'rgb(var(--color-olive))',
        'olive-light': 'rgb(var(--color-olive-light))',
        'dusty-blue': 'rgb(var(--color-dusty-blue))',
        'dusty-blue-light': 'rgb(var(--color-dusty-blue-light))',
        'dusty-blue-dark': 'rgb(var(--color-dusty-blue-dark))',
        terracotta: 'rgb(var(--color-terracotta))',
        'terracotta-light': 'rgb(var(--color-terracotta-light))',
        'terracotta-dark': 'rgb(var(--color-terracotta-dark))',
        charcoal: 'rgb(var(--color-charcoal))',
        'warm-gray': 'rgb(var(--color-warm-gray))',
        'soft-gray': 'rgb(var(--color-soft-gray))',
        gold: 'rgb(var(--color-gold))',
        background: 'rgb(var(--color-background))',
        surface: 'rgb(var(--color-surface))',
        border: 'rgb(var(--color-border))',
      },
      fontFamily: {
        serif: ['var(--font-serif)'],
        sans: ['var(--font-sans)'],
      },
      borderRadius: {
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        '3xl': 'var(--radius-3xl)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        DEFAULT: 'var(--shadow)',
        lg: 'var(--shadow-lg)',
      },
      spacing: {
        4: 'var(--space-4)',
        5: 'var(--space-5)',
        6: 'var(--space-6)',
        8: 'var(--space-8)',
        10: 'var(--space-10)',
        12: 'var(--space-12)',
        16: 'var(--space-16)',
        20: 'var(--space-20)',
        24: 'var(--space-24)',
        32: 'var(--space-32)',
      },
      animation: {
        'fade-in': 'fadeIn 0.8s ease-out forwards',
        'slide-up': 'slideUp 0.8s ease-out forwards',
        float: 'float 6s ease-in-out infinite',
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
