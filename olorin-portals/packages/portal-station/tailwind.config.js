const baseConfig = require('../shared/tailwind.config.base');

/** @type {import('tailwindcss').Config} */
module.exports = {
  ...baseConfig,
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "../shared/src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    ...baseConfig.theme,
    extend: {
      ...(baseConfig.theme?.extend || {}),
      colors: {
        ...(baseConfig.theme?.extend?.colors || {}),
        'station': {
          'deep': '#0f0027',        // wizard-bg-deep (NOT #11051B)
          'base': '#1a0033',        // wizard-bg-base
          'accent': '#9333ea',      // wizard purple (NOT coral red #F54E5E)
          'accent-hover': '#a855f7', // Lighter purple on hover
          'glow': 'rgba(147, 51, 234, 0.5)',  // Purple glow
        },
      },
      boxShadow: {
        'station-glow': '0 0 40px rgba(147, 51, 234, 0.5)',
        'station-glow-lg': '0 0 60px rgba(147, 51, 234, 0.6)',
      },
    },
  },
};
