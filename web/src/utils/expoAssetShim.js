/**
 * Expo Asset Shim for Web
 * Provides stub implementations for expo-asset APIs used by expo-font
 */

// Asset class stub
export class Asset {
  constructor(options = {}) {
    this.name = options.name || '';
    this.type = options.type || '';
    this.hash = options.hash || null;
    this.uri = options.uri || '';
    this.localUri = options.localUri || null;
    this.width = options.width || null;
    this.height = options.height || null;
    this.downloaded = false;
    this.downloading = false;
  }

  async downloadAsync() {
    this.downloaded = true;
    return this;
  }

  static fromModule(virtualAssetModule) {
    // For web, just return a stub asset
    if (typeof virtualAssetModule === 'number') {
      return new Asset({ uri: `asset://${virtualAssetModule}` });
    }
    if (typeof virtualAssetModule === 'string') {
      return new Asset({ uri: virtualAssetModule });
    }
    return new Asset(virtualAssetModule);
  }

  static fromURI(uri) {
    return new Asset({ uri });
  }

  static async loadAsync(moduleIds) {
    // No-op for web
    return [];
  }
}

// useAssets hook stub
export function useAssets(moduleIds) {
  // Return loaded state immediately for web
  return [moduleIds?.map(id => Asset.fromModule(id)) || [], null];
}

// Default export
export default Asset;
