const baseConfig = require('../shared/tailwind.config.base');

/** @type {import('tailwindcss').Config} */
module.exports = {
  ...baseConfig,
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "../shared/src/**/*.{js,jsx,ts,tsx}"
  ]
};
