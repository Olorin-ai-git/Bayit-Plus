/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
    '../shared/components/**/*.{js,jsx,ts,tsx}',
    '../shared/screens/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('../shared/design-tokens/tailwind.preset.js')],
  theme: {
    extend: {},
  },
  plugins: [],
};
