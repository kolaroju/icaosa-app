# ICAOSA app: launch guide

This guide takes the ICAOSA app from this GitHub repository to the Google Play Store and the Apple App Store. It is written for someone who is comfortable with computers but has not published an app before. Follow the steps in order; each one says what you need before you start and how to know it worked.

> **Just want the Android APK?** Follow [BUILD-APK.md](BUILD-APK.md). It builds everything from GitHub in your browser, with nothing to install. This longer guide covers the full launch, including the App Store.

Allow about two to four weeks end to end. Most of that time is waiting: Paystack business activation, Apple and Google account checks, and (for a personal Google account) a 14-day test period.

---

## What you will set up

| Service | What it does for ICAOSA | Cost |
|---|---|---|
| **Supabase** | Stores members, sets, posts, events and payments; signs people in; runs the server functions | Free plan to start. Free projects pause after a week with no activity, so move to the Pro plan before launch. |
| **Paystack** | Takes card, transfer and USSD payments and pays each set's bank account directly | No monthly fee; a fee per transaction (see Paystack's pricing page) |
| **An email sender** (Resend, Brevo or similar) | Sends the 6-digit sign-in codes | Free tiers are enough to start |
| **Firebase** (Google) | Delivers push notifications to Android phones | Free |
| **Expo** | Builds the Android and iPhone apps in the cloud and submits them to the stores | Free plan has a monthly build allowance |
| **Google Play Console** | Publishes the Android app | US$25, one time |
| **Apple Developer Program** | Publishes the iPhone app | US$99 per year |

**Decide early: personal or organisation store accounts.** If ICAOSA is registered with the CAC as Incorporated Trustees, open the Google and Apple accounts as an *organisation*. Both stores then show "ICAOSA" as the publisher, and both will ask for a free **D-U-N-S number** (apply at dnb.com; it can take a few weeks, so start now). A *personal* account is quicker, but the stores show your own name as the publisher, and a new personal Google account must run a closed test with at least 12 testers for 14 days before the app can go public.

You do **not** need a Mac. Expo builds the iPhone app in the cloud.

---

## Step 1. Get the project onto your computer

**You need:** a Windows, Mac or Linux computer.

1. Install **Node.js** (the "LTS" version) from nodejs.org.
2. Install **Git** from git-scm.com.
3. Open a terminal (Windows: "Command Prompt" or "PowerShell"; Mac: "Terminal") and run:

   ```sh
   git clone https://github.com/kolaroju/icaosa-app.git
   cd icaosa-app
   npm install
   ```

**It worked if** `npm install` finishes without red "ERR!" lines. Every command below is run from inside the `icaosa-app` folder.

---

## Step 2. Create the Supabase project (the database)

1. Sign up at supabase.com and create a **New project**. Name it `icaosa`, choose a strong database password (save it somewhere safe), and pick the region closest to Nigeria in the list.
2. When the project is ready, open **SQL Editor → New query**. Open the file `supabase/migrations/20261104000000_icaosa_schema.sql` from this project in a text editor, copy all of it, paste it into the SQL Editor and press **Run**.
   **It worked if** you see "Success. No rows returned." The tables now appear under **Table Editor**.
3. Open **Project Settings → API Keys** and copy two values:
   - the **Project URL** (looks like `https://abcdefgh.supabase.co`)
   - the **publishable key** (starts with `sb_publishable_`)
   Also note the **project reference**: the `abcdefgh` part of the URL.

### Email sign-in codes

Members sign in with a 6-digit code sent to their email. Supabase's built-in email only sends to your own team and only a couple of emails an hour, so connect a real email sender:

1. Create a free account with an email sender such as **Resend** or **Brevo**, and verify a domain you control (for example `icaosa.org`). The sender's website walks you through adding the DNS records.
2. In Supabase, open **Authentication → Emails → SMTP Settings**, turn on **custom SMTP**, and enter the host, port, username and password your email sender gives you. Use a sender address like `no-reply@icaosa.org` and sender name `ICAOSA`.
3. Open **Authentication → Emails → Templates → Magic Link** and replace the message with:

   ```html
   <h2>Your ICAOSA sign-in code</h2>
   <p>Enter this code in the ICAOSA app:</p>
   <p style="font-size:28px;font-weight:bold;letter-spacing:6px">{{ .Token }}</p>
   <p>The code expires in one hour. If you didn't ask for it, ignore this email.</p>
   ```

   Change the subject to `Your ICAOSA sign-in code`.
4. Open **Authentication → Rate Limits** and raise "emails sent per hour" to suit a launch day (for example 200).

### An account for the store reviewers

Apple and Google test the app before approving it, and they can't receive your email codes. Create one account that signs in with a password instead:

1. **Authentication → Users → Add user → Create new user.** Use an address on your domain, for example `review@icaosa.org`, set a password, and tick **Auto Confirm User**.
2. You'll put this email address into the app in Step 3 and give the password to Apple and Google in Steps 10 and 11.

---

## Step 3. Connect the app to Supabase

Open `eas.json` in a text editor and replace the three placeholder values under `"base" → "env"`:

```json
"EXPO_PUBLIC_SUPABASE_URL": "https://abcdefgh.supabase.co",
"EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY": "sb_publishable_...",
"EXPO_PUBLIC_REVIEW_EMAIL": "review@icaosa.org"
```

The publishable key is safe to put in the app; the database's access rules protect the data.

---

## Step 4. Set up Paystack

1. Sign up at paystack.com and start **business activation**. For an association registered as **Incorporated Trustees**, Paystack asks for Form CAC IT/1, your CAC/IT number, details of at least two trustees (each consents to a BVN check), proof of address, and a **SCUML certificate** (free from scuml.org; non-profits must have one). Activation can take several days; you can keep testing in Test Mode meanwhile.
2. Open **Settings → API Keys & Webhooks**. Copy the **Test Secret Key** (starts with `sk_test_`). You'll use the **Live Secret Key** (`sk_live_`) later, in Step 9.
3. Decide two association rules and set them in Supabase **SQL Editor**:

   ```sql
   -- Share of every set payment that goes to the central ICAOSA account (0 = none).
   -- Paystack's fee on set payments is paid by: 'subaccount' (the set) or 'account' (ICAOSA).
   update public.settings set association_percent = 0, fees_bearer = 'subaccount';
   ```

How the money moves: each set's bank account becomes a Paystack **subaccount** when its exco connects it in the app. A member's dues go straight to their own set's bank account, minus the association percentage above and Paystack's fee. Donations to association-wide appeals go to the main ICAOSA account.

---

## Step 5. Put the server functions online

The server functions start Paystack payments, confirm them, check bank accounts and send notifications.

1. In your terminal, sign in to Supabase and link the project (use your own project reference):

   ```sh
   npx supabase login
   npx supabase link --project-ref abcdefgh
   ```

2. Make up a long random password for the daily reminder job (for example from a password manager) and save the secrets:

   ```sh
   npx supabase secrets set PAYSTACK_SECRET_KEY=sk_test_xxxxxxxx CRON_SECRET=your-long-random-password
   ```

3. Deploy all functions:

   ```sh
   npx supabase functions deploy
   ```

   **It worked if** it lists eight functions, including `paystack-init` and `paystack-webhook`.
4. In Paystack, **Settings → API Keys & Webhooks**, set the **Test Webhook URL** to:

   `https://abcdefgh.supabase.co/functions/v1/paystack-webhook`

### Daily reminders (birthdays, events, dues)

1. In Supabase, open **Integrations** and enable **Cron** and **pg_net**.
2. Open `supabase/schedule-reminders.sql`, replace the project URL and the cron password (the same one as `CRON_SECRET` above), paste it into the SQL Editor and run it.

Every morning at 7:00 Lagos time the app now sends birthday wishes, reminders for the next day's events, and (on the 1st and 20th of each month) reminders to members who haven't paid that month's dues.

---

## Step 6. Push notifications for Android (Firebase)

1. Go to console.firebase.google.com, **Add project**, name it `ICAOSA` (Google Analytics can be off).
2. Click the Android icon to **add an Android app** with package name `ng.icaosa.app`. Download **google-services.json** and put it in the `icaosa-app` folder, next to `app.json`.
3. In Firebase, open **Project settings → Service accounts → Generate new private key**. This downloads a second JSON file. Keep it private; never put it in GitHub.
4. In your terminal:

   ```sh
   npx eas-cli@latest login
   npx eas-cli@latest init
   npx eas-cli@latest credentials
   ```

   `init` links the project to your Expo account (create one at expo.dev if needed) and writes a project ID into `app.json`. In `credentials`, choose **Android → production → Google Service Account → Manage your Google Service Account Key for Push Notifications (FCM V1) → Upload**, and select the private key file from point 3.

iPhone notifications need no extra setup: Expo creates the Apple push key the first time it builds the iPhone app (Step 11).

---

## Step 7. Make yourself the association admin

1. Build a test app (Step 8), sign in with your own email, and register into your set.
2. In Supabase **SQL Editor**, run (with your email address):

   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'aderoju.am@unilorin.edu.ng');
   ```

3. Close and reopen the app. Your profile now says you are an admin. From the **Members** tab you can tap **Make exco** for each set's treasurer and leaders. Excos can connect their set's bank account, confirm bank transfers, post announcements and start appeals.

Also register the reviewer account (Step 2) into a set, so the reviewers see a working app.

---

## Step 8. Build a test app and try everything

```sh
npx eas-cli@latest build --profile preview --platform android
```

The build runs in Expo's cloud (10–30 minutes). When it finishes, the page shows a QR code. Scan it with Android phones to install the test app. Share the link with a few classmates.

Check, with Paystack still in **Test Mode**:

- [ ] Sign in with an email code; register into a set.
- [ ] As an exco: **Dues → Connect set account**, choose a bank, enter an account number, and see the account name appear. Save, with a monthly dues amount.
- [ ] As a member: **Dues → Pay dues**, tick a month, pay with one of Paystack's test cards (listed in Paystack's docs under "Test Payments"). The month turns green and both you and the exco get a notification.
- [ ] Record a bank transfer; as the exco, mark it **Received**.
- [ ] Post news and an invite; add an event and RSVP; check that other test phones get notifications.
- [ ] Start an appeal and donate to it; the progress bar moves.
- [ ] Profile → **Delete my account** works (try it on a spare test account).

---

## Step 9. Switch Paystack to live

Only after Paystack has activated the business:

1. Replace the test key with the live key, and redeploy:

   ```sh
   npx supabase secrets set PAYSTACK_SECRET_KEY=sk_live_xxxxxxxx
   npx supabase functions deploy
   ```

2. In Paystack, set the **Live Webhook URL** to the same address as in Step 5.
3. Test-mode subaccounts don't exist in live mode, so clear them in the SQL Editor:

   ```sql
   update public.sets set paystack_subaccount = null;
   ```

   Then ask each set's exco to open **Dues → Account & dues** and tap **Save** once. That creates their live subaccount.
4. Make one real ₦100 donation to check money arrives.

---

## Step 10. Publish on Google Play

1. Create a developer account at play.google.com/console (US$25). Choose **Organisation** if you have the D-U-N-S number.
2. **Create app**: name `ICAOSA`, type **App**, **Free**.
3. Build the store version:

   ```sh
   npx eas-cli@latest build --profile production --platform android
   ```

   Download the `.aab` file from the build page.
4. Google requires the **first** upload to be done by hand: in Play Console open **Test and release → Testing → Internal testing → Create new release** and upload the `.aab`.
5. Fill in the **App content** pages:
   - **Privacy policy**: a public web page. A ready-to-edit text is in `docs/PRIVACY-POLICY.md`; put it on the ICAOSA website (or a free Google Sites page) and paste the link.
   - **App access**: "All or some functionality is restricted", and give the reviewer account: the email from Step 2, its password, and the note "Enter the email, tap *Send me a sign-in code*, and a password box appears."
   - **Data safety**: the app collects name, email address, phone number, and purchase history (payments), to run the app and manage accounts. Data is encrypted in transit. Users can request deletion: **in the app, Profile → Delete my account**. Card details are handled by Paystack.
   - **Content rating** questionnaire, **Target audience** (18 and over), **Ads**: no ads.
6. **Store listing**: short description, full description, the app icon (`assets/store/play-store-icon-512.png`, 512 × 512), the feature graphic (`assets/store/play-feature-graphic-1024x500.png`), and at least two phone screenshots (take them on a test phone).
7. If your account is **personal**: run a **Closed testing** track with at least 12 testers (classmates are ideal) for 14 days, then apply for production access. **Organisation** accounts can go to **Production** once the test release works.
8. Later releases can be sent straight from your terminal with `npx eas-cli@latest submit --platform android` (Expo's docs explain the one-time Google service account setup).

---

## Step 11. Publish on the App Store

1. Enrol at developer.apple.com/programs (US$99/year), as an **Organisation** if you have the D-U-N-S number.
2. Build and submit:

   ```sh
   npx eas-cli@latest build --profile production --platform ios
   ```

   Sign in with your Apple ID when asked. Let Expo create the certificates, and say **yes** when it offers to set up **push notifications**. Then:

   ```sh
   npx eas-cli@latest submit --platform ios
   ```

   This creates the app in **App Store Connect** and uploads the build.
3. In **App Store Connect → ICAOSA**, fill in the listing (screenshots from an iPhone, description, privacy policy link, support link; the 1024 × 1024 icon is `assets/store/app-store-icon-1024.png`) and the **App Privacy** questions (same answers as Google's Data safety above).
4. In **App Review Information**, give the reviewer account and paste this note:

   > ICAOSA is the app of the Ibadan City Academy Old Students Association. Monthly dues are membership fees for a real-world association, paid through Paystack under guideline 3.1.3(e). Donations to association appeals open in Safari and are collected outside the app, per guideline 3.2.2(iv). Accounts can be deleted in the app: Profile → Delete my account. To sign in, enter the review email, tap "Send me a sign-in code", and a password box appears.

5. Submit for review. Apple usually replies within a few days. If they ask questions, reply in App Store Connect; most first-time apps need one or two rounds.

---

## Running the app day to day

- **New set leaders:** an admin taps **Make exco** in Members.
- **Change the association's share:** rerun the `update public.settings` line from Step 4, then excos re-save their set account so Paystack applies the new percentage.
- **See what happened with a payment:** Supabase **Table Editor → payments** shows every payment and its status; Paystack's dashboard shows the money side.
- **Problems with a server function:** Supabase **Edge Functions → (function) → Logs**.
- **Publishing an update:** change the code, increase `"version"` in `app.json` (for example to `1.0.1`), build with the `production` profile and submit again (Steps 10 and 11).

## Troubleshooting

| What you see | What to do |
|---|---|
| The app says "ICAOSA isn't connected yet" | The values in `eas.json` (Step 3) are still placeholders. Fix them and build again. |
| No sign-in email arrives | Check custom SMTP (Step 2) and the email sender's logs; ask the member to check spam. |
| "Paystack could not find that account" | The account number or bank is wrong, or Paystack is in Test Mode and the bank isn't in its test list. |
| A set can't take payments | Its exco hasn't saved the account in **Dues → Account & dues**, or (after going live) hasn't re-saved it (Step 9). |
| Android phones get no notifications | `google-services.json` was missing when the app was built, or the FCM key wasn't uploaded (Step 6). |
| Payment shows "not finished yet" but money left the account | Wait a few minutes: the Paystack webhook confirms it. If not, check the webhook URL (Steps 5 and 9) and the `paystack-webhook` logs. |

## Useful official pages

- Expo: building (`docs.expo.dev/build/introduction`), submitting (`docs.expo.dev/submit/android`, `docs.expo.dev/submit/ios`), push setup (`docs.expo.dev/push-notifications/push-notifications-setup`)
- Supabase: custom SMTP (`supabase.com/docs/guides/auth/auth-smtp`), scheduling functions (`supabase.com/docs/guides/functions/schedule-functions`)
- Paystack: split payments (`paystack.com/docs/payments/split-payments`), webhooks (`paystack.com/docs/payments/webhooks`), business requirements (`support.paystack.com`)
- Apple App Review Guidelines (`developer.apple.com/app-store/review/guidelines`)
- Google Play testing requirements for new personal accounts (`support.google.com/googleplay/android-developer/answer/14151465`)
