const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');
const fs = require('fs');

const projectRoot = __dirname;
const sharedRoot = path.resolve(__dirname, '../shared');
const packagesRoot = path.resolve(__dirname, '../packages/ui');
const nodeModulesPath = path.resolve(projectRoot, 'node_modules');
const parentNodeModulesPath = path.resolve(__dirname, '../node_modules');

// Build extraNodeModules mapping including scoped packages
function getExtraNodeModules() {
  const modules = {};

  // Platform shims directory for web-to-native compatibility
  const shimsRoot = path.resolve(projectRoot, 'src/platform-shims');
  const sharedExists = fs.existsSync(sharedRoot);

  if (sharedExists) {
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
    modules['@bayit/shared-assets'] = path.resolve(sharedRoot, 'assets');

    // Subpath aliases for @bayit/shared/* imports
    modules['@bayit/shared/components/support'] = path.resolve(sharedRoot, 'components/support');
    modules['@bayit/shared/components/ui'] = path.resolve(sharedRoot, 'components/ui');
    modules['@bayit/shared/components/ai'] = path.resolve(sharedRoot, 'components/ai');
    modules['@bayit/shared/theme'] = path.resolve(sharedRoot, 'theme');
    modules['@bayit/shared/hooks'] = path.resolve(sharedRoot, 'hooks');
    modules['@bayit/shared/stores'] = path.resolve(sharedRoot, 'stores');
    modules['@bayit/shared/services'] = path.resolve(sharedRoot, 'services');
    modules['@bayit/shared/contexts'] = path.resolve(sharedRoot, 'contexts');
    modules['@bayit/shared/utils'] = path.resolve(sharedRoot, 'utils');
    modules['@bayit/shared/design-tokens'] = path.resolve(sharedRoot, 'design-tokens');

    // Add Picovoice platform shims for web-to-native compatibility
    modules['@picovoice/porcupine-web'] = path.resolve(projectRoot, 'src/platform-shims/porcupine-web.ts');
    modules['@picovoice/web-voice-processor'] = path.resolve(projectRoot, 'src/platform-shims/porcupine-web.ts');
  }

  // Add @olorin packages from packages/ui directory - point to package root for proper resolution
  modules['@olorin/design-tokens'] = path.resolve(packagesRoot, 'design-tokens');
  modules['@olorin/shared-hooks'] = path.resolve(packagesRoot, 'shared-hooks');
  modules['@olorin/shared-i18n'] = path.resolve(packagesRoot, 'shared-i18n');
  modules['@olorin/shared-services'] = path.resolve(packagesRoot, 'shared-services');
  modules['@olorin/shared-stores'] = path.resolve(packagesRoot, 'shared-stores');
  modules['@olorin/glass-ui'] = path.resolve(packagesRoot, 'glass-components');
  modules['@olorin/glass-ui/theme'] = path.resolve(packagesRoot, 'glass-components');

  // Add @/ path alias for local src directory imports
  modules['@'] = path.resolve(projectRoot, 'src');

  // Helper function to add modules from a node_modules directory
  function addModulesFromPath(nodeModPath) {
    if (!fs.existsSync(nodeModPath)) return;

    const nodeModulesList = fs.readdirSync(nodeModPath);

    for (const name of nodeModulesList) {
      if (name.startsWith('.')) continue;

      const modulePath = path.resolve(nodeModPath, name);

      // Handle scoped packages like @babel, @react-native, etc.
      if (name.startsWith('@')) {
        try {
          const scopedModules = fs.readdirSync(modulePath);
          for (const scopedName of scopedModules) {
            if (scopedName.startsWith('.')) continue;
            const fullName = `${name}/${scopedName}`;
            // Only add if not already mapped (local takes precedence)
            if (!modules[fullName]) {
              modules[fullName] = path.resolve(modulePath, scopedName);
            }
          }
        } catch {
          // Ignore if can't read scoped directory
        }
      } else {
        // Only add if not already mapped (local takes precedence)
        if (!modules[name]) {
          modules[name] = modulePath;
        }
      }
    }
  }

  // Map all node_modules from mobile-app first (takes precedence)
  addModulesFromPath(nodeModulesPath);

  // Then add from parent node_modules for hoisted packages
  addModulesFromPath(parentNodeModulesPath);

  return modules;
}

/**
 * Metro configuration for iOS mobile app
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  watchFolders: [sharedRoot, packagesRoot, parentNodeModulesPath],
  resolver: {
    // Enable symlinks for monorepo support
    unstable_enableSymlinks: true,
    // Make sure shared packages can find node_modules from mobile-app and parent (for hoisted packages)
    nodeModulesPaths: [nodeModulesPath, parentNodeModulesPath],
    extraNodeModules: getExtraNodeModules(),
    // Add .cjs extension for design-tokens
    sourceExts: ['js', 'jsx', 'ts', 'tsx', 'json', 'cjs'],
    // Redirect web-only and Expo packages to platform shims for React Native
    resolveRequest: (context, moduleName, platform) => {
      if (moduleName === 'react-dom') {
        return { type: 'empty' };
      }
      if (moduleName === 'react-router-dom') {
        return {
          type: 'sourceFile',
          filePath: path.resolve(projectRoot, 'src/platform-shims/react-router-dom.ts'),
        };
      }
      if (moduleName === 'expo-linear-gradient') {
        return {
          type: 'sourceFile',
          filePath: path.resolve(projectRoot, 'src/platform-shims/expo-linear-gradient.ts'),
        };
      }
      if (moduleName === '@expo/vector-icons') {
        return {
          type: 'sourceFile',
          filePath: path.resolve(projectRoot, 'src/platform-shims/@expo/vector-icons.tsx'),
        };
      }
      if (moduleName === 'react-native-web-linear-gradient') {
        return {
          type: 'sourceFile',
          filePath: path.resolve(projectRoot, 'src/platform-shims/react-native-web-linear-gradient.ts'),
        };
      }
      if (moduleName === 'lucide-react') {
        return {
          type: 'sourceFile',
          filePath: path.resolve(projectRoot, 'src/platform-shims/lucide-react.ts'),
        };
      }
      // Redirect web-only Picovoice packages to platform shims
      if (moduleName === '@picovoice/porcupine-web' || moduleName === '@picovoice/web-voice-processor') {
        return {
          type: 'sourceFile',
          filePath: path.resolve(projectRoot, 'src/platform-shims/porcupine-web.ts'),
        };
      }
      // Redirect web-specific voice services that use import.meta or browser APIs
      if (moduleName.endsWith('/ttsService') || moduleName.endsWith('/ttsService.ts')) {
        return {
          type: 'sourceFile',
          filePath: path.resolve(projectRoot, 'src/platform-shims/ttsService.ts'),
        };
      }
      if (moduleName.endsWith('/gazeDetectionService') || moduleName.endsWith('/gazeDetectionService.ts')) {
        return { type: 'empty' };
      }

      // Handle @/ path alias for local src directory imports
      if (moduleName.startsWith('@/')) {
        const relativePath = moduleName.slice(2); // Remove '@/'
        const srcPath = path.resolve(projectRoot, 'src', relativePath);

        // Try different extensions
        const extensions = ['.ts', '.tsx', '.js', '.jsx', ''];
        for (const ext of extensions) {
          const fullPath = srcPath + ext;
          if (fs.existsSync(fullPath)) {
            return { filePath: fullPath, type: 'sourceFile' };
          }
        }

        // Try as directory with index file
        const indexExtensions = ['index.ts', 'index.tsx', 'index.js', 'index.jsx'];
        for (const indexFile of indexExtensions) {
          const indexPath = path.resolve(srcPath, indexFile);
          if (fs.existsSync(indexPath)) {
            return { filePath: indexPath, type: 'sourceFile' };
          }
        }
      }

      // Handle @bayit/shared/X subpath imports
      const sharedSubpaths = {
        '@bayit/shared/components/support': path.resolve(sharedRoot, 'components/support'),
        '@bayit/shared/components/ui': path.resolve(sharedRoot, 'components/ui'),
        '@bayit/shared/components/ai': path.resolve(sharedRoot, 'components/ai'),
        '@bayit/shared/theme': path.resolve(sharedRoot, 'theme'),
        '@bayit/shared/hooks': path.resolve(sharedRoot, 'hooks'),
        '@bayit/shared/stores': path.resolve(sharedRoot, 'stores'),
        '@bayit/shared/services': path.resolve(sharedRoot, 'services'),
        '@bayit/shared/contexts': path.resolve(sharedRoot, 'contexts'),
        '@bayit/shared/utils': path.resolve(sharedRoot, 'utils'),
      };

      if (sharedSubpaths[moduleName]) {
        return {
          filePath: path.resolve(sharedSubpaths[moduleName], 'index.ts'),
          type: 'sourceFile',
        };
      }

      // Handle @bayit/shared/design-tokens/* imports (direct file imports)
      if (moduleName.startsWith('@bayit/shared/design-tokens/')) {
        const tokenFile = moduleName.replace('@bayit/shared/design-tokens/', '');
        return {
          filePath: path.resolve(sharedRoot, 'design-tokens', tokenFile),
          type: 'sourceFile',
        };
      }

      // Handle @bayit/shared/components/* imports (single component files)
      if (moduleName.startsWith('@bayit/shared/components/') && !sharedSubpaths[moduleName]) {
        const componentPath = moduleName.replace('@bayit/shared/components/', '');
        // Try .tsx first, then .ts
        const tsxPath = path.resolve(sharedRoot, 'components', `${componentPath}.tsx`);
        const tsPath = path.resolve(sharedRoot, 'components', `${componentPath}.ts`);
        const indexPath = path.resolve(sharedRoot, 'components', componentPath, 'index.ts');
        const indexTsxPath = path.resolve(sharedRoot, 'components', componentPath, 'index.tsx');

        const fs = require('fs');
        if (fs.existsSync(tsxPath)) {
          return { filePath: tsxPath, type: 'sourceFile' };
        }
        if (fs.existsSync(tsPath)) {
          return { filePath: tsPath, type: 'sourceFile' };
        }
        if (fs.existsSync(indexPath)) {
          return { filePath: indexPath, type: 'sourceFile' };
        }
        if (fs.existsSync(indexTsxPath)) {
          return { filePath: indexTsxPath, type: 'sourceFile' };
        }
      }

      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
