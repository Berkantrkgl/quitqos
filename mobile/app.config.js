// Env-driven Expo config (mirrors the PaceUp pattern). Project-specific identifiers come from
// EXPO_PUBLIC_* env vars (see .env.example) so the public repo carries no real values. Every var
// has a safe placeholder fallback so a fresh clone still builds.

const IS_PRODUCTION = process.env.EAS_BUILD_PROFILE === 'production';

// Placeholder fallbacks only — the real identifiers live in .env (gitignored).
const BUNDLE_ID = process.env.EXPO_PUBLIC_IOS_BUNDLE_ID || 'com.example.quitqos';
const ANDROID_PACKAGE = process.env.EXPO_PUBLIC_ANDROID_PACKAGE || 'com.example.quitqos';
const EAS_PROJECT_ID = process.env.EXPO_PUBLIC_EAS_PROJECT_ID || 'your-eas-project-id';
const EXPO_OWNER = process.env.EXPO_PUBLIC_EXPO_OWNER || undefined;

module.exports = {
  expo: {
    name: 'QuitQOS',
    slug: 'quitqos',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'quitqos',
    userInterfaceStyle: 'automatic',
    owner: EXPO_OWNER,
    updates: {
      url:
        process.env.EXPO_PUBLIC_UPDATES_URL || `https://u.expo.dev/${EAS_PROJECT_ID}`,
    },
    runtimeVersion: {
      policy: 'appVersion',
    },
    ios: {
      icon: './assets/expo.icon',
      supportsTablet: true,
      bundleIdentifier: BUNDLE_ID,
      usesAppleSignIn: true,
      config: {
        usesNonExemptEncryption: false,
      },
      // Dev builds talk to a local HTTP backend; allow arbitrary loads only in non-prod.
      infoPlist: IS_PRODUCTION
        ? {}
        : {
            NSAppTransportSecurity: {
              NSAllowsArbitraryLoads: true,
            },
          },
    },
    android: {
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
        foregroundImage: './assets/images/android-icon-foreground.png',
        backgroundImage: './assets/images/android-icon-background.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
      package: ANDROID_PACKAGE,
    },
    web: {
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          backgroundColor: '#208AEF',
          android: {
            image: './assets/images/splash-icon.png',
            imageWidth: 76,
          },
        },
      ],
      'expo-localization',
      'expo-apple-authentication',
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      eas: {
        projectId: EAS_PROJECT_ID,
      },
    },
  },
};
