import type { ConfigContext, ExpoConfig } from 'expo/config';

// Adds the Firebase file for Android push notifications when it is present.
// Put google-services.json in the project folder (see docs/LAUNCH-GUIDE.md, step 5),
// or upload it to Expo as a file environment variable named GOOGLE_SERVICES_JSON.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { existsSync } = require('fs') as { existsSync: (path: string) => boolean };

export default ({ config }: ConfigContext): ExpoConfig => {
  const googleServicesFile =
    process.env.GOOGLE_SERVICES_JSON ?? (existsSync('./google-services.json') ? './google-services.json' : undefined);
  return {
    ...(config as ExpoConfig),
    android: {
      ...config.android,
      ...(googleServicesFile ? { googleServicesFile } : {}),
    },
  };
};
