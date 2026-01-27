/**
 * React Native configuration for monorepo autolinking
 * Points autolinking to root node_modules for native modules
 */

const path = require('path');

module.exports = {
  project: {
    ios: {
      sourceDir: './ios',
    },
  },
  dependencies: {
    'react-native-gesture-handler': {
      root: path.resolve(__dirname, '../node_modules/react-native-gesture-handler'),
    },
    'react-native-screens': {
      root: path.resolve(__dirname, '../node_modules/react-native-screens'),
    },
    'react-native-safe-area-context': {
      root: path.resolve(__dirname, '../node_modules/react-native-safe-area-context'),
    },
  },
};
