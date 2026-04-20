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
  plugins: [
    'expo-secure-store',
    'expo-web-browser',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#ffffff',
        image: './assets/splash.png',
        imageWidth: 240,
        resizeMode: 'contain',
      },
    ],
  ],
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
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
