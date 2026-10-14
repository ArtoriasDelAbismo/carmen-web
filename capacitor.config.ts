import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.cuidarte.carmen',
    appName: 'Carmen',
    webDir: 'dist',
    android: { allowMixedContent: false },
    plugins: {
      // Carmen's page is dark: light status/navigation bar icons on it.
      SystemBars: { style: 'DARK' },
    },
  }

export default config;
