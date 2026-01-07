const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

const sharedRoot = path.resolve(__dirname, '../shared');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  watchFolders: [sharedRoot],
  resolver: {
    extraNodeModules: {
      '@bayit/shared': path.resolve(sharedRoot, 'components'),
      '@bayit/shared-screens': path.resolve(sharedRoot, 'screens'),
      '@bayit/shared-services': path.resolve(sharedRoot, 'services'),
      '@bayit/shared-stores': path.resolve(sharedRoot, 'stores'),
      '@bayit/shared-hooks': path.resolve(sharedRoot, 'hooks'),
      '@bayit/shared-contexts': path.resolve(sharedRoot, 'contexts'),
      '@bayit/shared-i18n': path.resolve(sharedRoot, 'i18n'),
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
