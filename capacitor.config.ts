import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mastergrowbot.app',
  appName: 'MasterGrowbot AI',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: 'YOUR_GOOGLE_CLIENT_ID', // Replace with actual Client ID if available
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;