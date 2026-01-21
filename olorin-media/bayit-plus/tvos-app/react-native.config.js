module.exports = {
  // Block packages that don't support tvOS
  dependencies: {
    'react-native-webrtc': {
      platforms: {
        ios: null,
        android: null,
      },
    },
    '@livekit/react-native': {
      platforms: {
        ios: null,
        android: null,
      },
    },
    '@livekit/react-native-webrtc': {
      platforms: {
        ios: null,
        android: null,
      },
    },
  },
  project: {
    ios: {
      sourceDir: './tvos',
    },
  },
};
