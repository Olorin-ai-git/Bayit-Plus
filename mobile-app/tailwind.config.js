/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
    '../shared/components/**/*.{js,jsx,ts,tsx}',
    '../shared/screens/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('@olorin/design-tokens/tailwind.preset')],
  theme: {
    extend: {},
  },
  plugins: [],
};
