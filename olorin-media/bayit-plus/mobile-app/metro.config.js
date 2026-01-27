/**
 * Metro configuration for BayitPlus Mobile
 * Configured for monorepo npm workspaces
 */

const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(__dirname, '..');
const rootNodeModules = path.resolve(workspaceRoot, 'node_modules');

const defaultConfig = getDefaultConfig(__dirname);

const localNodeModules = path.resolve(__dirname, 'node_modules');

// Packages that MUST come from mobile-app's node_modules (React 19.2.0 compatible)
const localPackages = ['react', 'react-dom', 'scheduler'];

const config = {
  projectRoot: __dirname,
  watchFolders: [projectRoot, rootNodeModules],
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
      '@babel/runtime': path.resolve(rootNodeModules, '@babel/runtime'),
      'react': path.resolve(localNodeModules, 'react'),
      'react-native': path.resolve(rootNodeModules, 'react-native'),
      'react/jsx-runtime': path.resolve(localNodeModules, 'react/jsx-runtime'),
      'react/jsx-dev-runtime': path.resolve(localNodeModules, 'react/jsx-dev-runtime'),
      'scheduler': path.resolve(localNodeModules, 'scheduler'),
      'react-dom': path.resolve(localNodeModules, 'react-dom'),
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
