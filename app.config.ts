import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'feedry',
  slug: 'feedry',
  scheme: 'feedry',
  version: '1.0.0',
  web: {
    favicon: './assets/favicon.png',
  },
  experiments: {
    tsconfigPaths: true,
  },
  plugins: ['expo-secure-store'],
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    bundleIdentifier: 'com.debuggingmess.feedry',
    supportsTablet: true,
  },
  android: {
    softwareKeyboardLayoutMode: 'resize',
    package: 'com.debuggingmess.feedry',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
  },
};

export default config;
