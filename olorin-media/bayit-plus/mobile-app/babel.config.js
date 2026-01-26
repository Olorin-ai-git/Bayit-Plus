module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // 'nativewind/babel', // Temporarily disabled - shadow-* classes cause PostCSS failures
    // 'react-native-reanimated/plugin', // Temporarily disabled for troubleshooting
  ],
};
