import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.todayshabit.daymark',
  appName: 'Nitya',
  webDir: 'dist',
  backgroundColor: '#f5f9f6',
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#f5f9f6',
      showSpinner: false,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#4f947b',
      overlaysWebView: false,
    },
  },
};

export default config;