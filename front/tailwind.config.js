/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        'slide-in-down': {
          '0%': {
            visibility: 'visible',
            transform: 'translate3d(0, -100%, 0)',
          },
          '100%': { transform: 'translate3d(0, 0, 0)' },
        },
        'slide-in-up': {
          '0%': { visibility: 'visible', transform: 'translate3d(0, 100%, 0)' },
          '100%': { transform: 'translate3d(0, 0, 0)' },
        },
        'slide-in-left': {
          '0%': {
            visibility: 'visible',
            transform: 'translate3d(-100%, 0, 0)',
          },
          '100%': { transform: 'translate3d(0, 0, 0)' },
        },
        'slide-in-right': {
          '0%': { visibility: 'visible', transform: 'translate3d(100%, 0, 0)' },
          '100%': { transform: 'translate3d(0, 0, 0)' },
        },
        'slide-out-down': {
          '0%': { transform: 'translate3d(0, 0, 0)' },
          '100%': {
            visibility: 'hidden',
            transform: 'translate3d(0, 100%, 0)',
          },
        },
        'slide-out-up': {
          '0%': { transform: 'translate3d(0, 0, 0)' },
          '100%': {
            visibility: 'hidden',
            transform: 'translate3d(0, -100%, 0)',
          },
        },
        'slide-out-left': {
          '0%': { transform: 'translate3d(0, 0, 0)' },
          '100%': {
            visibility: 'hidden',
            transform: 'translate3d(-100%, 0, 0)',
          },
        },
        'slide-out-right': {
          '0%': { transform: 'translate3d(0, 0, 0)' },
          '100%': {
            visibility: 'hidden',
            transform: 'translate3d(100%, 0, 0)',
          },
        },
        'slide-down': {
          '0%': { transform: 'translate3d(0, 0, 0)' },
          '100%': { transform: 'translate3d(0, 100%, 0)' },
        },
        'slide-up': {
          '0%': { transform: 'translate3d(0, 0, 0)' },
          '100%': { transform: 'translate3d(0, -100%, 0)' },
        },
        'slide-left': {
          '0%': { transform: 'translate3d(0, 0, 0)' },
          '100%': { transform: 'translate3d(-100%, 0, 0)' },
        },
        'slide-right': {
          '0%': { transform: 'translate3d(0, 0, 0)' },
          '100%': { transform: 'translate3d(100%, 0, 0)' },
        },
        typing: {
          '0%': {
            width: '0%',
            visibility: 'hidden',
          },
          '100%': {
            width: '100%',
          },
        },
        blink: {
          '50%': {
            borderColor: 'transparent',
          },
          '100%': {
            borderColor: 'white',
          },
        },
      },
      animation: {
        slideindown: 'slide-in-down 3s ease-in-out infinite',
        slideinup: 'slide-in-up 3s ease-in-out infinite',
        slideinleft: 'slide-in-left 3s ease-in-out infinite',
        slideinright: 'slide-in-right 3s ease-in-out infinite',
        slideoutdown: 'slide-out-down 3s ease-in-out infinite',
        slideoutup: 'slide-out-up 3s ease-in-out infinite',
        slideoutleft: 'slide-out-left 3s ease-in-out infinite',
        slideoutright: 'slide-out-right 3s ease-in-out infinite',
        slidedown: 'slide-down 3s ease-in-out infinite',
        slideup: 'slide-up 3s ease-in-out infinite',
        slideleft: 'slide-left 3s ease-in-out infinite',
        slideright: 'slide-right 3s ease-in-out infinite',
        typing: 'typing 2s steps(20) infinite alternate, blink .7s infinite',
      },
    },
  },
  plugins: [],
  important: true,
};
