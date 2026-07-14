// Env-driven Expo config (mirrors the PaceUp pattern). Project-specific identifiers come from
// EXPO_PUBLIC_* env vars (see .env.example) so the public repo carries no real values. Every var
// has a safe placeholder fallback so a fresh clone still builds.

const IS_PRODUCTION = process.env.EAS_BUILD_PROFILE === 'production';

// Placeholder fallbacks only — the real identifiers live in .env (gitignored).
const BUNDLE_ID = process.env.EXPO_PUBLIC_IOS_BUNDLE_ID || 'com.example.quitqos';
const ANDROID_PACKAGE = process.env.EXPO_PUBLIC_ANDROID_PACKAGE || 'com.example.quitqos';
const EAS_PROJECT_ID = process.env.EXPO_PUBLIC_EAS_PROJECT_ID || 'c31466cb-5b7d-4219-a087-1dd618f28693';
const EXPO_OWNER = process.env.EXPO_PUBLIC_EXPO_OWNER || 'berkantrkgl';

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
      icon: './assets/images/icon.png',
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
        backgroundColor: '#E4F5EF',
        foregroundImage: './assets/images/android-icon-foreground.png',
        backgroundImage: './assets/images/android-icon-background.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
      package: ANDROID_PACKAGE,
      // Android 13+ requires this to be declared before the app can request/show notifications
      // (guest local milestones + registered FCM pushes). Neither plugin adds it automatically.
      permissions: ['android.permission.POST_NOTIFICATIONS'],
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
          // "Sükût" calm-white splash. Mark is composited over these bg colors
          // (light/dark auto). imageWidth ~ the mark's rendered width on screen.
          backgroundColor: '#FBFDFC',
          dark: {
            backgroundColor: '#0C1210',
          },
          image: './assets/images/splash-icon.png',
          imageWidth: 120,
          android: {
            image: './assets/images/splash-icon.png',
            imageWidth: 120,
          },
        },
      ],
      'expo-localization',
      'expo-apple-authentication',
      // Native date picker for the "quit earlier" (backdated) sheet.
      '@react-native-community/datetimepicker',
      // Local (guest) milestone notifications. Sets the Android small-icon + accent color so the
      // scheduled notifications match the brand. Guests get 13 pre-scheduled local notifications;
      // registered users receive milestone pushes via FCM instead (see src/lib/notifications.ts).
      [
        'expo-notifications',
        {
          icon: './assets/images/android-icon-monochrome.png',
          color: '#0E9E77',
        },
      ],
      // Firebase + Google Sign-In native modules (config plugins wire the Gradle/pod setup so we
      // don't touch native files by hand). These require a fresh dev-client build to take effect.
      '@react-native-firebase/app',
      '@react-native-firebase/auth',
      '@react-native-firebase/messaging',
      [
        '@react-native-google-signin/google-signin',
        {
          iosUrlScheme: process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME || 'com.googleusercontent.apps.413546581870-vmm8ccj83iqf5qcca5fni8uhfvg9ohki',
        },
      ],
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
