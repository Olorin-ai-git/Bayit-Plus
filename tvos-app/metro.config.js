const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');
const fs = require('fs');

const projectRoot = __dirname;
const sharedRoot = path.resolve(__dirname, '../shared');
const nodeModulesPath = path.resolve(projectRoot, 'node_modules');

const shimsRoot = path.resolve(__dirname, 'src/shims');

// Build extraNodeModules mapping including scoped packages
function getExtraNodeModules() {
  const modules = {};

  // Add shared package aliases
  modules['@bayit/shared'] = path.resolve(sharedRoot, 'components');
  modules['@bayit/shared-screens'] = path.resolve(sharedRoot, 'screens');
  modules['@bayit/shared-services'] = path.resolve(sharedRoot, 'services');
  modules['@bayit/shared-stores'] = path.resolve(sharedRoot, 'stores');
  modules['@bayit/shared-hooks'] = path.resolve(sharedRoot, 'hooks');
  modules['@bayit/shared-contexts'] = path.resolve(sharedRoot, 'contexts');
  modules['@bayit/shared-i18n'] = path.resolve(sharedRoot, 'i18n');

  // Shim Expo packages to React Native alternatives
  modules['expo-linear-gradient'] = path.resolve(shimsRoot, 'expo-linear-gradient.ts');
  modules['@expo/vector-icons'] = path.resolve(shimsRoot, 'expo-vector-icons.ts');

  // Map all node_modules from tvos-app
  const nodeModulesList = fs.readdirSync(nodeModulesPath);

  for (const name of nodeModulesList) {
    if (name.startsWith('.')) continue;

    const modulePath = path.resolve(nodeModulesPath, name);

    // Handle scoped packages like @babel, @react-native, etc.
    if (name.startsWith('@')) {
      const scopedModules = fs.readdirSync(modulePath);
      for (const scopedName of scopedModules) {
        if (scopedName.startsWith('.')) continue;
        const fullName = `${name}/${scopedName}`;
        modules[fullName] = path.resolve(modulePath, scopedName);
      }
    } else {
      modules[name] = modulePath;
    }
  }

  return modules;
}

/**
 * Metro configuration for tvOS app
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  watchFolders: [sharedRoot],
  resolver: {
    // Make sure shared packages can find node_modules from tvos-app
    nodeModulesPaths: [nodeModulesPath],
    extraNodeModules: getExtraNodeModules(),
    // Block WebRTC/LiveKit packages that don't support tvOS
    blockList: [
      /react-native-webrtc/,
      /@livekit/,
    ],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
