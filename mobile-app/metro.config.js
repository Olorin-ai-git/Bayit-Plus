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

const config = {
  projectRoot: __dirname,
  watchFolders: [projectRoot, rootNodeModules],
  resolver: {
    unstable_enableSymlinks: true,
    nodeModulesPaths: [
      path.resolve(__dirname, 'node_modules'),
      rootNodeModules,
    ],
    sourceExts: ['js', 'json', 'ts', 'tsx'],
    resolverMainFields: ['react.native', 'browser', 'main'],
    extraNodeModules: {
      '@babel/runtime': path.resolve(rootNodeModules, '@babel/runtime'),
    },
  },
};

module.exports = mergeConfig(defaultConfig, config);
