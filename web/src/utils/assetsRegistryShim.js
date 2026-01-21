// Shim for @react-native/assets-registry which uses Flow types
// This module is not needed for web builds

export function registerAsset(asset) {
  return asset;
}

export function getAssetByID(assetId) {
  return null;
}
