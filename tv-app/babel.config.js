module.exports = function(api) {
  api.cache(true);

  // Only include NativeWind preset for native builds (not webpack/web)
  const isWeb = api.caller((caller) => caller && caller.name === 'babel-loader');

  const presets = [
    ['module:@react-native/babel-preset', { jsxRuntime: 'automatic' }],
  ];

  // Add NativeWind preset only for native builds
  if (!isWeb) {
    presets.push('nativewind/babel');
  }

  return {
    presets,
  };
};
