const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');
const fs = require('fs');

const projectRoot = __dirname;
const sharedRoot = path.resolve(__dirname, '../shared');
const nodeModulesPath = path.resolve(projectRoot, 'node_modules');

// Build extraNodeModules mapping including scoped packages
function getExtraNodeModules() {
  const modules = {};

  // Check if shared directory exists, otherwise use stubs
  const stubsRoot = path.resolve(projectRoot, 'src/stubs');
  const useStubs = !fs.existsSync(sharedRoot);

  if (useStubs) {
    // Use stubs when shared directory doesn't exist
    modules['@bayit/shared'] = path.resolve(stubsRoot, 'shared-components');
    modules['@bayit/shared-screens'] = path.resolve(stubsRoot, 'shared-screens');
    modules['@bayit/shared-services'] = path.resolve(stubsRoot, 'shared-services');
    modules['@bayit/shared-stores'] = path.resolve(stubsRoot, 'shared-stores');
    modules['@bayit/shared-hooks'] = path.resolve(stubsRoot, 'shared-hooks');
    modules['@bayit/shared-contexts'] = path.resolve(stubsRoot, 'shared-contexts');
    modules['@bayit/shared-i18n'] = path.resolve(stubsRoot, 'shared-i18n');
    modules['@bayit/shared-config'] = path.resolve(stubsRoot, 'shared-config');
    modules['@bayit/shared-types'] = path.resolve(stubsRoot, 'shared-types');
    modules['@bayit/shared-utils'] = path.resolve(stubsRoot, 'shared-utils');
    modules['@bayit/shared-components'] = path.resolve(stubsRoot, 'shared-components');
  } else {
    // Use real shared directory
    modules['@bayit/shared'] = path.resolve(sharedRoot, 'components');
    modules['@bayit/shared-components'] = path.resolve(sharedRoot, 'components');
    modules['@bayit/shared-screens'] = path.resolve(sharedRoot, 'screens');
    modules['@bayit/shared-services'] = path.resolve(sharedRoot, 'services');
    modules['@bayit/shared-stores'] = path.resolve(sharedRoot, 'stores');
    modules['@bayit/shared-hooks'] = path.resolve(sharedRoot, 'hooks');
    modules['@bayit/shared-contexts'] = path.resolve(sharedRoot, 'contexts');
    modules['@bayit/shared-i18n'] = path.resolve(sharedRoot, 'i18n');
    modules['@bayit/shared-config'] = path.resolve(sharedRoot, 'config');
    modules['@bayit/shared-types'] = path.resolve(sharedRoot, 'types');
    modules['@bayit/shared-utils'] = path.resolve(sharedRoot, 'utils');
  }

  // Map all node_modules from mobile-app
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
 * Metro configuration for iOS mobile app
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  watchFolders: [sharedRoot],
  resolver: {
    // Make sure shared packages can find node_modules from mobile-app
    nodeModulesPaths: [nodeModulesPath],
    extraNodeModules: getExtraNodeModules(),
    // Add .cjs extension for design-tokens
    sourceExts: ['js', 'jsx', 'ts', 'tsx', 'json', 'cjs'],
    // Stub out web-only and Expo packages for React Native
    resolveRequest: (context, moduleName, platform) => {
      if (moduleName === 'react-dom') {
        return { type: 'empty' };
      }
      if (moduleName === 'react-router-dom') {
        return {
          type: 'sourceFile',
          filePath: path.resolve(projectRoot, 'src/stubs/react-router-dom.ts'),
        };
      }
      if (moduleName === 'expo-linear-gradient') {
        return {
          type: 'sourceFile',
          filePath: path.resolve(projectRoot, 'src/stubs/expo-linear-gradient.ts'),
        };
      }
      if (moduleName === '@expo/vector-icons') {
        return {
          type: 'sourceFile',
          filePath: path.resolve(projectRoot, 'src/stubs/@expo/vector-icons.tsx'),
        };
      }
      if (moduleName === 'react-native-web-linear-gradient') {
        return {
          type: 'sourceFile',
          filePath: path.resolve(projectRoot, 'src/stubs/react-native-web-linear-gradient.ts'),
        };
      }
      if (moduleName === 'lucide-react') {
        return {
          type: 'sourceFile',
          filePath: path.resolve(projectRoot, 'src/stubs/lucide-react.ts'),
        };
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
