# Getting the ICAOSA APK (no installs needed)

This is the shortest route from the code on GitHub to an Android APK that members can install. Everything happens in your web browser: you copy keys from Supabase, Expo and Paystack into GitHub once, then press **Run workflow**. GitHub and Expo do the building.

You'll need about an hour for the one-time setup, then 10 to 40 minutes per build.

**Keep keys out of files.** This repository is public. Keys only ever go into GitHub's **Secrets and variables** pages, which nobody else can read. Never paste a key into a file in the repository.

---

## Part 1. Supabase (the database)

Skip this part if you have already created the Supabase project and run the SQL.

1. Sign in at supabase.com → **New project**. Name it `icaosa`, choose a strong database password and save it, and pick the region closest to Nigeria.
2. When it's ready, open **SQL Editor → New query**. On GitHub, open `supabase/migrations/20261104000000_icaosa_schema.sql`, click the **Copy raw file** button, paste into the SQL Editor and press **Run**. You should see "Success. No rows returned."
3. Open **Project Settings → API Keys** and keep this tab open. You need:
   - the **Project URL**, like `https://abcdefghijklmnop.supabase.co`
   - the **publishable key**, starting with `sb_publishable_`
4. Click your avatar (top right) → **Account preferences → Access Tokens → Generate new token**. Name it `GitHub`, then copy the token (it starts with `sbp_`). You'll only see it once.

## Part 2. Expo (the app builder)

1. Sign up at expo.dev.
2. Click **Create a project**. Display name `ICAOSA`, slug **`icaosa`** (it must be exactly this).
3. On the project page, copy the **ID** (it looks like `1a2b3c4d-5e6f-...`). Also note your account name in the page address: `expo.dev/accounts/`**`your-name`**`/projects/icaosa`.
4. Open your avatar → **Account settings → Access tokens → Create token**. Name it `GitHub` and copy it.

## Part 3. Put the settings into GitHub

On github.com/kolaroju/icaosa-app open **Settings → Secrets and variables → Actions**.

On the **Variables** tab, click **New repository variable** for each of these:

| Name | Value |
|---|---|
| `SUPABASE_URL` | the Project URL from Part 1 |
| `SUPABASE_PUBLISHABLE_KEY` | the `sb_publishable_...` key from Part 1 |
| `EXPO_PROJECT_ID` | the project ID from Part 2 |
| `EXPO_OWNER` | your Expo account name from Part 2 |
| `REVIEW_EMAIL` | *(optional, for the store reviewers later)* e.g. `review@icaosa.org` |

On the **Secrets** tab, click **New repository secret** for each of these:

| Name | Value |
|---|---|
| `EXPO_TOKEN` | the Expo access token from Part 2 |
| `SUPABASE_ACCESS_TOKEN` | the `sbp_...` token from Part 1 |
| `PAYSTACK_SECRET_KEY` | from Paystack → Settings → API Keys & Webhooks. Start with the **test** key (`sk_test_...`); see Part 7. |
| `CRON_SECRET` | any long random password you make up (it protects the daily reminders) |
| `GOOGLE_SERVICES_JSON` | *(for push notifications, Part 4)* |

## Part 4. Push notifications (Firebase)

You can skip this for the very first test APK; the app works without it, just with no phone notifications. Do it before sharing the app with members.

1. Go to console.firebase.google.com → **Create a project** → name it `ICAOSA` (Analytics can be off).
2. Click the **Android** icon to add an app. Package name: **`ng.icaosa.app`**. Click **Register app**, then **Download google-services.json**.
3. Open the downloaded file in Notepad, select everything, copy, and paste it as the GitHub secret `GOOGLE_SERVICES_JSON` (Part 3).
4. Back in Firebase: **Project settings (gear icon) → Service accounts → Generate new private key**. This downloads a second file. Keep it private.
5. On expo.dev open the ICAOSA project → **Credentials** → **Android** → **Add application identifier** → `ng.icaosa.app`. (If this option doesn't appear yet, come back after your first build in Part 6; that creates it.) Then **FCM V1 service account key → Add a service account key → Upload** the file from step 4 → **Save**.

## Part 5. Put the server functions online

1. On GitHub open the **Actions** tab. (If GitHub asks you to enable workflows, click the green button to enable them.)
2. Click **Deploy server functions** on the left → **Run workflow** → **Run workflow**.
3. After a minute or two the run shows a green tick. Click it: the summary shows your **Paystack webhook address**.
4. In Paystack → **Settings → API Keys & Webhooks**, paste that address as the **Test Webhook URL** (or **Live Webhook URL** if you used a live key) and save.

Run this workflow again whenever the server code or a Paystack key changes.

## Part 6. Build the APK

1. **Actions** tab → **Build Android app** → **Run workflow**. Keep **APK to install and share** selected and click **Run workflow**.
2. Wait. The **Build on Expo** step takes 10 to 40 minutes; on Expo's free plan, builds sometimes wait in a queue first.
3. When the run has a green tick, click it. The summary at the top shows:
   - a **Download** link for the APK. Open it on an Android phone to install it, or share it with your set WhatsApp groups.
   - a link to the Expo build page, which has a QR code to scan for installing.

   The APK is also attached at the bottom of the run, under **Artifacts**.

Android will ask the first time to **allow installs from this source** (your browser or WhatsApp). Allow it once.

Each new build installs over the previous one, and members keep their sign-in.

## Part 7. First things to do in the app

1. Install the APK, sign in with your email, and register into your set.
2. Make yourself the association admin: in Supabase **SQL Editor** run

   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'YOUR-EMAIL-HERE');
   ```

   Then close and reopen the app.
3. In **Members**, tap **Make exco** for each set's treasurer.
4. An exco opens **Dues → Connect set account**, picks the bank, enters the account number, checks the name that appears, sets the monthly dues and taps **Save**.
5. Pay a month's dues with a Paystack test card (Paystack's docs list them under "Test Payments") and check that the month turns green.

**Switching Paystack to live** once everything works:

1. Change the GitHub secret `PAYSTACK_SECRET_KEY` to the `sk_live_...` key.
2. Run **Deploy server functions** again, and put the webhook address into Paystack's **Live Webhook URL**.
3. In Supabase **SQL Editor** run `update public.sets set paystack_subaccount = null;` (test subaccounts don't exist in live mode).
4. Ask each exco to open **Dues → Account & dues** and tap **Save** once.
5. Make one real ₦100 donation to check the money arrives.

## Before you share the app widely

- **Sign-in emails.** Supabase's built-in email only reaches members of your Supabase team, about two emails an hour. Connect an email sender (Resend or Brevo) before inviting classmates: [LAUNCH-GUIDE.md](LAUNCH-GUIDE.md), step 2, "Email sign-in codes".
- **Daily reminders** (birthdays, tomorrow's events, dues): run the SQL in `supabase/schedule-reminders.sql` once: [LAUNCH-GUIDE.md](LAUNCH-GUIDE.md), step 5.

## When something goes wrong

Open the failed run on the **Actions** tab and click the step with the red ✗. The message says what's missing.

| Red ✗ on | What to do |
|---|---|
| Check the Expo token is set | Add the `EXPO_TOKEN` secret (Part 3). |
| Apply ICAOSA settings | The message names the missing or wrong variable. Fix it in Settings → Secrets and variables → Actions, then run again. |
| Build on Expo | Open the Expo build page link in the next step (or expo.dev → ICAOSA → Builds) and read the red part of the log. If it says the project or slug doesn't match, check that `EXPO_PROJECT_ID` and `EXPO_OWNER` are from the project whose slug is `icaosa`. |
| Check settings (Deploy server functions) | The message names the missing secret or variable. |
| Deploy the functions | Check the `SUPABASE_ACCESS_TOKEN` secret is a current `sbp_...` token and `SUPABASE_URL` is your project's address. |

**For the Play Store:** run **Build Android app** with **Play Store bundle (.aab)** selected, then follow [LAUNCH-GUIDE.md](LAUNCH-GUIDE.md), step 10. The store icon and feature graphic are ready in `assets/store/`.
