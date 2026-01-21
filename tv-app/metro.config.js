const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');
const fs = require('fs');

const projectRoot = __dirname;
const sharedRoot = path.resolve(__dirname, '../shared');
const packagesRoot = path.resolve(__dirname, '../packages/ui');
const nodeModulesPath = path.resolve(projectRoot, 'node_modules');
const shimsRoot = path.resolve(__dirname, 'src/shims');

// Build extraNodeModules mapping including scoped packages
function getExtraNodeModules() {
  const modules = {};

  // Add @olorin packages from packages/ui directory
  modules['@olorin/design-tokens'] = path.resolve(packagesRoot, 'design-tokens/src');
  modules['@olorin/shared-hooks'] = path.resolve(packagesRoot, 'shared-hooks/src');
  modules['@olorin/shared-i18n'] = path.resolve(packagesRoot, 'shared-i18n/src');
  modules['@olorin/shared-services'] = path.resolve(packagesRoot, 'shared-services/src');
  modules['@olorin/shared-stores'] = path.resolve(packagesRoot, 'shared-stores/src');

  // Add shared package aliases
  modules['@bayit/shared'] = path.resolve(sharedRoot, 'components');
  modules['@bayit/shared-screens'] = path.resolve(sharedRoot, 'screens');
  modules['@bayit/shared-services'] = path.resolve(sharedRoot, 'services');
  modules['@bayit/shared-stores'] = path.resolve(sharedRoot, 'stores');
  modules['@bayit/shared-hooks'] = path.resolve(sharedRoot, 'hooks');
  modules['@bayit/shared-contexts'] = path.resolve(sharedRoot, 'contexts');
  modules['@bayit/shared-i18n'] = path.resolve(sharedRoot, 'i18n');
  modules['@bayit/shared-assets'] = path.resolve(sharedRoot, 'assets');

  // Shim Expo packages to React Native alternatives
  modules['expo-linear-gradient'] = path.resolve(shimsRoot, 'expo-linear-gradient.ts');
  modules['@expo/vector-icons'] = path.resolve(shimsRoot, 'expo-vector-icons.ts');

  // Map all node_modules from tv-app
  const nodeModulesList = fs.readdirSync(nodeModulesPath);

  for (const name of nodeModulesList) {
    if (name.startsWith('.')) continue;

    const modulePath = path.resolve(nodeModulesPath, name);

    // Handle scoped packages like @babel, @react-native, etc.
    if (name.startsWith('@')) {
      try {
        const scopedModules = fs.readdirSync(modulePath);
        for (const scopedName of scopedModules) {
          if (scopedName.startsWith('.')) continue;
          const fullName = `${name}/${scopedName}`;
          modules[fullName] = path.resolve(modulePath, scopedName);
        }
      } catch {
        // Ignore if can't read scoped directory
      }
    } else {
      modules[name] = modulePath;
    }
  }

  return modules;
}

/**
 * Metro configuration for Android TV app
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  watchFolders: [sharedRoot, packagesRoot],
  resolver: {
    // Make sure shared packages can find node_modules from tv-app
    nodeModulesPaths: [nodeModulesPath],
    extraNodeModules: getExtraNodeModules(),
    // Add .cjs extension for design-tokens
    sourceExts: ['js', 'jsx', 'ts', 'tsx', 'json', 'cjs'],
    // Block WebRTC/LiveKit packages that don't support Android TV
    blockList: [
      /react-native-webrtc/,
      /@livekit/,
    ],
    // Stub out react-dom for React Native (used conditionally in some shared components)
    resolveRequest: (context, moduleName, platform) => {
      if (moduleName === 'react-dom') {
        return { type: 'empty' };
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
