/** @type {import('tailwindcss').Config} */
const designTokensPreset = require('@olorin/design-tokens/tailwind.preset');

module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [designTokensPreset],
  theme: {
    extend: {},
  },
  plugins: [],
};
