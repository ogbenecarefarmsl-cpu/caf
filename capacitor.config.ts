import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.caf.pharmacy',
  appName: 'CAREFARM POS',
  webDir: 'dist',
  plugins: {
    CapacitorUpdater: {
      appId: 'com.caf.pharmacy',
      autoUpdate: true,
      defaultChannel: 'production',
      directUpdate: false,
    },
  },
};

export default config;
