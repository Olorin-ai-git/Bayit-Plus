/** @type {import('tailwindcss').Config} */
const baseConfig = require('../shared/tailwind.config.base');

module.exports = {
  ...baseConfig,
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html",
    "../shared/src/**/*.{js,jsx,ts,tsx}",
  ],
}
