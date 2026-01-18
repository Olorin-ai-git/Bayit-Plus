const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');
const fs = require('fs');

const projectRoot = __dirname;
const sharedRoot = path.resolve(__dirname, '../shared');
const tvAppRoot = path.resolve(__dirname, '../tv-app');
const nodeModulesPath = path.resolve(projectRoot, 'node_modules');

const shimsRoot = path.resolve(__dirname, 'src/shims');

// Build extraNodeModules mapping including scoped packages
function getExtraNodeModules() {
  const modules = {};

  // Map all node_modules from tvos-app FIRST
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

  // Add shared package aliases AFTER node_modules (to override if needed)
  modules['@bayit/shared'] = path.resolve(sharedRoot, 'components');
  modules['@bayit/shared-screens'] = path.resolve(sharedRoot, 'screens');
  modules['@bayit/shared-services'] = path.resolve(sharedRoot, 'services');
  modules['@bayit/shared-stores'] = path.resolve(sharedRoot, 'stores');
  modules['@bayit/shared-hooks'] = path.resolve(sharedRoot, 'hooks');
  modules['@bayit/shared-contexts'] = path.resolve(sharedRoot, 'contexts');
  modules['@bayit/shared-i18n'] = path.resolve(sharedRoot, 'i18n');
  modules['@bayit/shared-assets'] = path.resolve(sharedRoot, 'assets');

  // Add tv-app admin screens alias
  modules['@bayit/admin-screens'] = path.resolve(tvAppRoot, 'src/screens/admin');
  modules['@bayit/shared/admin'] = path.resolve(sharedRoot, 'components/admin');
  modules['@bayit/shared/theme'] = path.resolve(sharedRoot, 'theme');

  // Additional shared package subpath aliases for tv-app compatibility
  modules['@bayit/shared/hooks'] = path.resolve(sharedRoot, 'hooks');
  modules['@bayit/shared/utils'] = path.resolve(sharedRoot, 'utils');
  modules['@bayit/shared/stores'] = path.resolve(sharedRoot, 'stores');
  modules['@bayit/shared/contexts'] = path.resolve(sharedRoot, 'contexts');
  modules['@bayit/shared/services'] = path.resolve(sharedRoot, 'services');
  modules['@bayit/shared/chat'] = path.resolve(sharedRoot, 'components/chat');
  modules['@bayit/shared/ui'] = path.resolve(sharedRoot, 'components/ui');
  modules['@bayit/shared/watchparty'] = path.resolve(sharedRoot, 'components/watchparty');
  modules['@bayit/shared-shims'] = path.resolve(sharedRoot, 'shims');

  // Shim Expo packages to React Native alternatives
  modules['expo-linear-gradient'] = path.resolve(shimsRoot, 'expo-linear-gradient.ts');
  modules['@expo/vector-icons'] = path.resolve(shimsRoot, 'expo-vector-icons.ts');
  
  // Shim web-specific linear gradient package
  modules['react-native-web-linear-gradient'] = path.resolve(shimsRoot, 'react-native-web-linear-gradient.ts');

  return modules;
}

/**
 * Metro configuration for tvOS app
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  watchFolders: [sharedRoot, tvAppRoot],
  resolver: {
    // Make sure shared packages can find node_modules from tvos-app
    nodeModulesPaths: [nodeModulesPath],
    extraNodeModules: getExtraNodeModules(),
    // Block WebRTC/LiveKit packages that don't support tvOS
    // Also block tv-app's node_modules to avoid version conflicts
    blockList: [
      /react-native-webrtc/,
      /@livekit/,
      /tv-app\/node_modules/,
    ],
    // Custom resolution for shared package subpaths and react-dom stub
    resolveRequest: (context, moduleName, platform) => {
      // Stub out react-dom for React Native
      if (moduleName === 'react-dom') {
        return { type: 'empty' };
      }

      // Shim react-router-dom for React Native
      if (moduleName === 'react-router-dom') {
        return {
          filePath: path.resolve(shimsRoot, 'react-router-dom.tsx'),
          type: 'sourceFile',
        };
      }

      // Shim lucide-react for React Native
      if (moduleName === 'lucide-react') {
        return {
          filePath: path.resolve(shimsRoot, 'lucide-react.tsx'),
          type: 'sourceFile',
        };
      }

      // Shim Watch Party components (WebRTC not supported on tvOS)
      if (moduleName === '../components/watchparty' || moduleName.includes('/watchparty')) {
        return {
          filePath: path.resolve(shimsRoot, 'watchparty.tsx'),
          type: 'sourceFile',
        };
      }

      // Shim Watch Party store (WebRTC not supported on tvOS)
      if (moduleName === '../stores/watchPartyStore' || moduleName.includes('watchPartyStore')) {
        return {
          filePath: path.resolve(shimsRoot, 'watchPartyStore.ts'),
          type: 'sourceFile',
        };
      }

      // Shim TTS Service (web audio APIs not supported on tvOS)
      if (moduleName === './ttsService' || moduleName.includes('ttsService')) {
        return {
          filePath: path.resolve(shimsRoot, 'ttsService.ts'),
          type: 'sourceFile',
        };
      }

      // Handle @bayit/shared/X subpath imports from tv-app
      const sharedSubpaths = {
        '@bayit/shared/hooks': path.resolve(sharedRoot, 'hooks'),
        '@bayit/shared/utils': path.resolve(sharedRoot, 'utils'),
        '@bayit/shared/stores': path.resolve(sharedRoot, 'stores'),
        '@bayit/shared/contexts': path.resolve(sharedRoot, 'contexts'),
        '@bayit/shared/services': path.resolve(sharedRoot, 'services'),
        '@bayit/shared/admin': path.resolve(sharedRoot, 'components/admin'),
        '@bayit/shared/theme': path.resolve(sharedRoot, 'theme'),
        '@bayit/shared/chat': path.resolve(sharedRoot, 'components/chat'),
        '@bayit/shared/ui': path.resolve(sharedRoot, 'components/ui'),
        '@bayit/shared/watchparty': path.resolve(sharedRoot, 'components/watchparty'),
      };

      // Handle single-file imports (not folders)
      const singleFileImports = {
        '@bayit/shared/ProfileDropdown': path.resolve(sharedRoot, 'components/ProfileDropdown.tsx'),
      };

      if (singleFileImports[moduleName]) {
        return {
          filePath: singleFileImports[moduleName],
          type: 'sourceFile',
        };
      }

      if (sharedSubpaths[moduleName]) {
        return {
          filePath: path.resolve(sharedSubpaths[moduleName], 'index.ts'),
          type: 'sourceFile',
        };
      }

      // Handle @bayit/shared/watchparty/ComponentName subpath imports
      if (moduleName.startsWith('@bayit/shared/watchparty/')) {
        const componentName = moduleName.replace('@bayit/shared/watchparty/', '');
        return {
          filePath: path.resolve(sharedRoot, 'components/watchparty', `${componentName}.tsx`),
          type: 'sourceFile',
        };
      }

      // Handle @bayit/shared-shims subpath imports
      if (moduleName.startsWith('@bayit/shared-shims/')) {
        const shimName = moduleName.replace('@bayit/shared-shims/', '');
        return {
          filePath: path.resolve(sharedRoot, 'shims', `${shimName}.ts`),
          type: 'sourceFile',
        };
      }

      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
