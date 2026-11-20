// Runs on GitHub before an Android build. Copies the association's settings
// (GitHub repository variables and secrets) into app.json, eas.json and
// google-services.json, and stops with a plain explanation if one is missing.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const env = (name) => (process.env[name] ?? '').trim();
const problems = [];
const notes = [];

const appJson = JSON.parse(readFileSync('app.json', 'utf8'));
const easJson = JSON.parse(readFileSync('eas.json', 'utf8'));
const buildEnv = (easJson.build.base.env ??= {});

// Expo project
const projectId = env('EXPO_PROJECT_ID') || appJson.expo.extra?.eas?.projectId;
if (!projectId || !/^[0-9a-f-]{36}$/i.test(projectId)) {
  problems.push('EXPO_PROJECT_ID is missing or not a project ID. On expo.dev open your ICAOSA project, copy its "ID" (it looks like 1a2b3c4d-....) and add it as a repository variable named EXPO_PROJECT_ID.');
} else {
  appJson.expo.extra = { ...appJson.expo.extra, eas: { ...appJson.expo.extra?.eas, projectId } };
}
if (env('EXPO_OWNER')) appJson.expo.owner = env('EXPO_OWNER');

// Supabase
const url = env('SUPABASE_URL') || buildEnv.EXPO_PUBLIC_SUPABASE_URL;
const key = env('SUPABASE_PUBLISHABLE_KEY') || buildEnv.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || url.includes('REPLACE') || !/^https:\/\/[a-z0-9]+\.supabase\.co\/?$/.test(url)) {
  problems.push('SUPABASE_URL is missing. In Supabase open Project Settings → API Keys, copy the Project URL (https://xxxx.supabase.co) and add it as a repository variable named SUPABASE_URL.');
} else {
  buildEnv.EXPO_PUBLIC_SUPABASE_URL = url.replace(/\/$/, '');
}
if (!key || key.includes('REPLACE')) {
  problems.push('SUPABASE_PUBLISHABLE_KEY is missing. In Supabase open Project Settings → API Keys, copy the publishable key (sb_publishable_...) and add it as a repository variable named SUPABASE_PUBLISHABLE_KEY.');
} else if (key.startsWith('sb_secret_') || key.includes('service_role')) {
  problems.push('SUPABASE_PUBLISHABLE_KEY holds a SECRET key. Use the publishable key (sb_publishable_...) instead; the secret key must never go into the app.');
} else {
  buildEnv.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = key;
}

// Store reviewer sign-in (optional)
const review = env('REVIEW_EMAIL') || buildEnv.EXPO_PUBLIC_REVIEW_EMAIL || '';
buildEnv.EXPO_PUBLIC_REVIEW_EMAIL = review.includes('REPLACE') ? '' : review;

// Firebase file for Android push notifications (optional for a first test build)
const gs = env('GOOGLE_SERVICES_JSON_CONTENT');
if (gs) {
  try {
    const parsed = JSON.parse(gs);
    const pkgs = (parsed.client ?? []).map((c) => c.client_info?.android_client_info?.package_name);
    if (!pkgs.includes(appJson.expo.android.package)) {
      problems.push(`The GOOGLE_SERVICES_JSON secret is for ${pkgs.join(', ') || 'another app'}, not ${appJson.expo.android.package}. In Firebase, add an Android app with package name ${appJson.expo.android.package} and download its google-services.json.`);
    } else {
      writeFileSync('google-services.json', JSON.stringify(parsed, null, 2));
      notes.push('Push notifications: on (google-services.json added).');
    }
  } catch {
    problems.push('The GOOGLE_SERVICES_JSON secret is not valid JSON. Open google-services.json in Notepad, copy everything, and paste it again as the secret.');
  }
} else if (!existsSync('google-services.json')) {
  notes.push('Push notifications: OFF for this build. Add the GOOGLE_SERVICES_JSON secret to turn them on (docs/BUILD-APK.md, part 4).');
}

if (problems.length) {
  for (const p of problems) console.log(`::error title=Setting missing::${p}`);
  process.exit(1);
}

writeFileSync('app.json', JSON.stringify(appJson, null, 2) + '\n');
writeFileSync('eas.json', JSON.stringify(easJson, null, 2) + '\n');
console.log('Build settings applied.');
console.log(`  Supabase: ${buildEnv.EXPO_PUBLIC_SUPABASE_URL}`);
console.log(`  Expo project: ${projectId}${appJson.expo.owner ? ` (owner ${appJson.expo.owner})` : ''}`);
for (const n of notes) console.log(`  ${n}`);
if (process.env.GITHUB_STEP_SUMMARY) {
  writeFileSync(process.env.GITHUB_STEP_SUMMARY, notes.map((n) => `- ${n}\n`).join(''), { flag: 'a' });
}
