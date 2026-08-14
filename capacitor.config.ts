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
    backgroundColor: '#ffffff',
  },
  ios: {
    contentInset: 'automatic',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#0061a4',
      androidSplashResourceName: 'splash',
      showSpinner: true,
      androidSpinnerStyle: 'large',
      iosSpinnerStyle: 'small',
      spinnerColor: '#ffffff',
    },
    StatusBar: {
      style: 'light',
      backgroundColor: '#0061a4',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
