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
      // Firebase config for iOS. Gitignored (real values); absent until we build for iOS on a Mac.
      // Defined so the RNFirebase config plugin doesn't fail prebuild when it runs the iOS mods.
      googleServicesFile: process.env.GOOGLE_SERVICES_PLIST || './GoogleService-Info.plist',
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
      // Firebase config for Android. Gitignored (real values), so the file may be absent on a
      // fresh clone — RNFirebase's config plugin only needs it at native build time.
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON || './google-services.json',
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
      // Firebase + Google Sign-In native modules (config plugins wire the Gradle/pod setup so we
      // don't touch native files by hand). These require a fresh dev-client build to take effect.
      '@react-native-firebase/app',
      '@react-native-firebase/auth',
      '@react-native-google-signin/google-signin',
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
