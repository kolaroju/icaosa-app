// Reads the JSON that `eas build --json` printed and writes the download link
// to the GitHub run summary. Usage: node report-build.mjs build.json
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';

const raw = readFileSync(process.argv[2], 'utf8').trim();
let builds;
try {
  builds = JSON.parse(raw.slice(raw.indexOf('[')));
} catch {
  console.log('::error::Expo did not return build details. Open the "Build on Expo" step above to see what happened.');
  process.exit(1);
}
const b = Array.isArray(builds) ? builds[0] : builds;
const url = b?.artifacts?.applicationArchiveUrl ?? b?.artifacts?.buildUrl;
const page = b?.id && b.app?.ownerAccount?.name ? `https://expo.dev/accounts/${b.app.ownerAccount.name}/projects/${b.app.slug}/builds/${b.id}` : null;
const kind = url?.endsWith('.aab') ? 'Play Store bundle (.aab)' : 'APK';

if (b?.status !== 'FINISHED' || !url) {
  console.log(`::error::The build ended with status ${b?.status ?? 'unknown'}${b?.error?.message ? `: ${b.error.message}` : ''}. ${page ? `Open ${page} to read the build log.` : ''}`);
  process.exit(1);
}

const summary = [
  `## ICAOSA ${kind} is ready`,
  '',
  `**Version:** ${b.appVersion ?? '?'} (build ${b.appBuildVersion ?? '?'})`,
  '',
  `**Download:** ${url}`,
  '',
  kind === 'APK'
    ? 'Open the download link on an Android phone to install, or share it in your set WhatsApp groups. The phone may ask to allow installs from your browser; allow it once.'
    : 'Upload this .aab file in Google Play Console (see docs/LAUNCH-GUIDE.md, step 10).',
  '',
  page ? `Expo build page (install QR code and logs): ${page}` : '',
].join('\n');

console.log(summary);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary + '\n');
writeFileSync('artifact-url.txt', url);
