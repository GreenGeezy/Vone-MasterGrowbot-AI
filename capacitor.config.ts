import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mastergrowbot.app',
  appName: 'MasterGrowbot AI',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;