/**
 * Metro configuration for BayitPlus Mobile
 * Configured for monorepo npm workspaces
 */

const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(__dirname, '..');
const rootNodeModules = path.resolve(workspaceRoot, 'node_modules');
const packagesRoot = path.resolve(workspaceRoot, 'packages/ui');
const sharedRoot = path.resolve(workspaceRoot, 'shared');

const defaultConfig = getDefaultConfig(__dirname);

const localNodeModules = path.resolve(__dirname, 'node_modules');

// Packages that MUST come from mobile-app's node_modules (React 19.2.0 compatible)
const localPackages = ['react', 'react-dom', 'scheduler'];

const config = {
  projectRoot: __dirname,
  watchFolders: [projectRoot, rootNodeModules, packagesRoot, sharedRoot],
  resolver: {
    unstable_enableSymlinks: true,
    nodeModulesPaths: [
      localNodeModules,
      rootNodeModules,
    ],
    sourceExts: ['js', 'json', 'ts', 'tsx'],
    resolverMainFields: ['react.native', 'browser', 'main'],
    // Force React and core packages to resolve from correct locations
    extraNodeModules: {
      // Babel runtime
      '@babel/runtime': path.resolve(rootNodeModules, '@babel/runtime'),

      // React packages - MUST be from local (React 19.2.0)
      'react': path.resolve(localNodeModules, 'react'),
      'react/jsx-runtime': path.resolve(localNodeModules, 'react/jsx-runtime'),
      'react/jsx-dev-runtime': path.resolve(localNodeModules, 'react/jsx-dev-runtime'),
      'scheduler': path.resolve(localNodeModules, 'scheduler'),
      'react-dom': path.resolve(localNodeModules, 'react-dom'),

      // React Native
      'react-native': path.resolve(rootNodeModules, 'react-native'),
      'react-native-screens': path.resolve(rootNodeModules, 'react-native-screens'),
      'react-native-safe-area-context': path.resolve(rootNodeModules, 'react-native-safe-area-context'),

      // Navigation
      '@react-navigation/native': path.resolve(rootNodeModules, '@react-navigation/native'),
      '@react-navigation/native-stack': path.resolve(rootNodeModules, '@react-navigation/native-stack'),
      '@react-navigation/stack': path.resolve(rootNodeModules, '@react-navigation/stack'),
      '@react-navigation/bottom-tabs': path.resolve(rootNodeModules, '@react-navigation/bottom-tabs'),
      '@react-navigation/core': path.resolve(rootNodeModules, '@react-navigation/core'),
      '@react-navigation/elements': path.resolve(rootNodeModules, '@react-navigation/elements'),
      '@react-navigation/routers': path.resolve(rootNodeModules, '@react-navigation/routers'),
      'react-native-gesture-handler': path.resolve(rootNodeModules, 'react-native-gesture-handler'),

      // State management
      '@tanstack/react-query': path.resolve(rootNodeModules, '@tanstack/react-query'),
      '@tanstack/query-core': path.resolve(rootNodeModules, '@tanstack/query-core'),
      'zustand': path.resolve(rootNodeModules, 'zustand'),

      // Lucide icons for React Native
      'lucide-react-native': path.resolve(rootNodeModules, 'lucide-react-native'),
      'react-native-svg': path.resolve(rootNodeModules, 'react-native-svg'),

      // @olorin packages from packages/ui (using root of each package, not src/)
      '@olorin/design-tokens': path.resolve(packagesRoot, 'design-tokens'),
      '@olorin/shared-i18n': path.resolve(packagesRoot, 'shared-i18n'),
      '@olorin/shared-i18n/native': path.resolve(packagesRoot, 'shared-i18n/native.ts'),
      '@olorin/shared-hooks': path.resolve(packagesRoot, 'shared-hooks'),
      '@olorin/shared-icons': path.resolve(packagesRoot, 'shared-icons'),
      '@olorin/shared-icons/native': path.resolve(packagesRoot, 'shared-icons/src/native'),
      '@olorin/shared-services': path.resolve(packagesRoot, 'shared-services'),
      '@olorin/shared-stores': path.resolve(packagesRoot, 'shared-stores'),

      // Glass UI components for React Native
      '@olorin/glass-ui': path.resolve(packagesRoot, 'glass-components/src/native'),
      '@olorin/glass-ui/native': path.resolve(packagesRoot, 'glass-components/src/native'),
      '@olorin/glass-ui/theme': path.resolve(packagesRoot, 'glass-components/src/theme'),
      '@olorin/glass-components': path.resolve(packagesRoot, 'glass-components/src/native'),

      // @bayit shared packages (from /shared directory)
      '@bayit/shared-screens': path.resolve(sharedRoot, 'screens'),
      '@bayit/shared-components': path.resolve(sharedRoot, 'components'),
      '@bayit/shared-services': path.resolve(sharedRoot, 'services'),
      '@bayit/shared-hooks': path.resolve(sharedRoot, 'hooks'),
      '@bayit/shared-utils': path.resolve(sharedRoot, 'utils'),
      '@bayit/shared-theme': path.resolve(sharedRoot, 'theme'),
      '@bayit/shared-config': path.resolve(sharedRoot, 'config'),
      '@bayit/shared-contexts': path.resolve(sharedRoot, 'contexts'),
    },
    // Force resolution of React packages from local node_modules regardless of where the import originates
    resolveRequest: (context, moduleName, platform) => {
      // Check if this is a package that must come from local
      for (const pkg of localPackages) {
        if (moduleName === pkg || moduleName.startsWith(pkg + '/')) {
          const localPath = path.resolve(localNodeModules, moduleName);
          return context.resolveRequest(
            { ...context, originModulePath: localPath },
            moduleName,
            platform
          );
        }
      }
      // Default resolution
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(defaultConfig, config);
