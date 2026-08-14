import type { CapacitorConfig } from '@capacitor/cli';

const serverUrl = process.env.CAPACITOR_SERVER_URL;

const config: CapacitorConfig = {
  appId: 'app.aurais',
  appName: 'AuraIsHub',
  webDir: 'dist',
  // Deep link schemes: auraishub://trading?tradeId=42 etc.
  appUrlScheme: 'auraishub',
  // In dev mode, run `npx cap run android --live` or set CAPACITOR_SERVER_URL
  // to hot-reload against the Vite dev server instead of the bundled build.
  ...(serverUrl ? { server: { url: serverUrl, cleartext: true } } : {}),
  android: {
    allowMixedContent: true,
    backgroundColor: '#111111',
  },
  ios: {
    contentInset: 'automatic',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      launchFadeOutDuration: 300,
      backgroundColor: '#111111',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
    StatusBar: {
      style: 'light',
      backgroundColor: '#111111',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
