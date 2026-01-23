const baseConfig = require('../shared/tailwind.config.base');

module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './public/index.html',
    '../shared/src/**/*.{js,jsx,ts,tsx}',
    '../shared/dist/**/*.{js,jsx,ts,tsx}',
  ],
  theme: baseConfig.theme,
  plugins: baseConfig.plugins,
};
