const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');
const fs = require('fs');

const projectRoot = __dirname;
const sharedRoot = path.resolve(__dirname, '../shared');
const tvAppRoot = path.resolve(__dirname, '../tv-app');
const workspaceRoot = path.resolve(__dirname, '..');
const workspaceNodeModules = path.resolve(workspaceRoot, 'node_modules');
const packagesRoot = path.resolve(workspaceRoot, 'packages/ui');

const shimsRoot = path.resolve(__dirname, 'src/shims');
const localNodeModules = path.resolve(__dirname, 'node_modules');

// Packages that MUST come from tvos-app's node_modules (React 19.2.0 compatible)
const localPackages = ['react', 'scheduler'];

/**
 * Metro configuration for tvOS app
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  projectRoot: __dirname,
  watchFolders: [projectRoot, workspaceNodeModules, sharedRoot, tvAppRoot, packagesRoot],
  resolver: {
    // Enable symlinks support for workspace
    unstable_enableSymlinks: true,
    // Make sure shared packages can find node_modules from tvos-app and workspace root
    nodeModulesPaths: [
      path.resolve(__dirname, 'node_modules'),
      workspaceNodeModules,
    ],
    sourceExts: ['js', 'json', 'ts', 'tsx'],
    extraNodeModules: {
      '@babel/runtime': path.resolve(workspaceNodeModules, '@babel/runtime'),
      // Force React 19.2.0 from local node_modules (root has React 18.3.1)
      'react': path.resolve(localNodeModules, 'react'),
      'react/jsx-runtime': path.resolve(localNodeModules, 'react/jsx-runtime'),
      'react/jsx-dev-runtime': path.resolve(localNodeModules, 'react/jsx-dev-runtime'),
      'scheduler': path.resolve(localNodeModules, 'scheduler'),
      // @olorin packages from packages/ui
      '@olorin/design-tokens': path.resolve(packagesRoot, 'design-tokens/src'),
      '@olorin/shared-hooks': path.resolve(packagesRoot, 'shared-hooks/src'),
      '@olorin/shared-i18n': path.resolve(packagesRoot, 'shared-i18n/src'),
      '@olorin/shared-icons': path.resolve(packagesRoot, 'shared-icons/src'),
      '@olorin/shared-services': path.resolve(packagesRoot, 'shared-services/src'),
      '@olorin/shared-stores': path.resolve(packagesRoot, 'shared-stores/src'),
      // Shared package aliases
      '@bayit/shared': path.resolve(sharedRoot, 'components'),
      '@bayit/shared-screens': path.resolve(sharedRoot, 'screens'),
      '@bayit/shared-services': path.resolve(sharedRoot, 'services'),
      '@bayit/shared-stores': path.resolve(sharedRoot, 'stores'),
      '@bayit/shared-hooks': path.resolve(sharedRoot, 'hooks'),
      '@bayit/shared-contexts': path.resolve(sharedRoot, 'contexts'),
      '@bayit/shared-i18n': path.resolve(sharedRoot, 'i18n'),
      '@bayit/shared-assets': path.resolve(sharedRoot, 'assets'),
      '@bayit/shared-config': path.resolve(sharedRoot, 'config'),
      '@bayit/shared-utils': path.resolve(sharedRoot, 'utils'),
      '@bayit/admin-screens': path.resolve(tvAppRoot, 'src/screens/admin'),
      '@bayit/shared-shims': path.resolve(sharedRoot, 'shims'),
      // Shim Expo packages
      'expo-linear-gradient': path.resolve(shimsRoot, 'expo-linear-gradient.ts'),
      '@expo/vector-icons': path.resolve(shimsRoot, 'expo-vector-icons.ts'),
      'react-native-web-linear-gradient': path.resolve(shimsRoot, 'react-native-web-linear-gradient.ts'),
      // Shim Picovoice Porcupine
      '@picovoice/porcupine-web': path.resolve(shimsRoot, 'porcupine-web.ts'),
      '@picovoice/web-voice-processor': path.resolve(shimsRoot, 'porcupine-web.ts'),
    },
    // Block WebRTC/LiveKit packages that don't support tvOS
    blockList: [
      /react-native-webrtc/,
      /@livekit/,
      /tv-app\/node_modules/,
    ],
    // Custom resolution for shared package subpaths and shims
    resolveRequest: (context, moduleName, platform) => {
      // CRITICAL: Force React packages from local node_modules to avoid version conflicts
      // Root has React 18.3.1, tvos-app needs React 19.2.0
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

      // Handle @ path alias (TypeScript alias for src directory)
      if (moduleName.startsWith('@/')) {
        const relativePath = moduleName.replace('@/', '');
        const possibleExtensions = ['.ts', '.tsx', '.js', '.jsx'];

        // Try with provided name first
        const basePath = path.resolve(projectRoot, 'src', relativePath);
        if (require('fs').existsSync(basePath)) {
          return {
            filePath: basePath,
            type: 'sourceFile',
          };
        }

        // Try adding extensions
        for (const ext of possibleExtensions) {
          const fullPath = basePath + ext;
          if (require('fs').existsSync(fullPath)) {
            return {
              filePath: fullPath,
              type: 'sourceFile',
            };
          }
        }
      }

      // Handle @bayit/shared subpath imports
      const sharedSubpaths = {
        '@bayit/shared/components/ui': path.resolve(sharedRoot, 'components/ui'),
        '@bayit/shared/components/support': path.resolve(sharedRoot, 'components/support'),
        '@bayit/shared/chat': path.resolve(sharedRoot, 'components/chat'),
        '@bayit/shared/hooks': path.resolve(sharedRoot, 'hooks'),
        '@bayit/shared/utils': path.resolve(sharedRoot, 'utils'),
        '@bayit/shared/stores': path.resolve(sharedRoot, 'stores'),
        '@bayit/shared/contexts': path.resolve(sharedRoot, 'contexts'),
        '@bayit/shared/services': path.resolve(sharedRoot, 'services'),
        '@bayit/shared/admin': path.resolve(sharedRoot, 'components/admin'),
        '@bayit/shared/theme': path.resolve(sharedRoot, 'theme'),
        '@bayit/shared/watchparty': path.resolve(sharedRoot, 'components/watchparty'),
        '@bayit/shared/ui': path.resolve(sharedRoot, 'components/ui'),
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
