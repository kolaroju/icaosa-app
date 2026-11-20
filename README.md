# ICAOSA

The mobile app of the **Ibadan City Academy Old Students Association**. Old students register into their graduating set, and each set coordinates itself:

- **Feed:** news, invites (weddings, naming ceremonies, burials) and exco announcements, per set and association-wide, with WhatsApp sharing
- **Events:** dates, venues, RSVPs, add-to-calendar
- **Dues and donations:** pay monthly dues and give to appeals through **Paystack**; money settles straight into each set's own bank account (Paystack subaccounts). Members can also record bank transfers for a treasurer to confirm.
- **Notifications:** push notifications for birthdays, new posts and events, the day before events, monthly dues reminders and payment receipts
- **Members:** directory by set, birthdays this month, WhatsApp links; admins appoint set excos

**To get the Android APK, follow [docs/BUILD-APK.md](docs/BUILD-APK.md)** (everything runs from GitHub in the browser).
**For the full store launch, follow [docs/LAUNCH-GUIDE.md](docs/LAUNCH-GUIDE.md).**

## How it is built

| Part | Technology | Where |
|---|---|---|
| Mobile app (Android + iPhone) | Expo SDK 58, React Native, Expo Router, TanStack Query | `src/` |
| Database, sign-in, access rules | Supabase (Postgres with Row Level Security) | `supabase/migrations/` |
| Server functions | Supabase Edge Functions (Deno) | `supabase/functions/` |
| Payments | Paystack (hosted checkout, subaccounts, webhooks) | `supabase/functions/paystack-*` |
| Push | Expo push service → FCM / APNs | `supabase/functions/_shared/push.ts` |
| Daily reminders | pg_cron → `daily-reminders` function | `supabase/schedule-reminders.sql` |
| Builds from GitHub | GitHub Actions: "Build Android app" (EAS Build), "Deploy server functions" (Supabase CLI) | `.github/workflows/`, `scripts/ci/` |
| Icons and store art | Made from the ICAOSA logo (`assets/brand/`) | `tools/make_icons.py`, `assets/images/`, `assets/store/` |

### App screens (`src/app/`)

`sign-in` (email code) → `onboarding` (choose set) → tabs: `index` (Home), `feed`, `events`, `dues` (with the treasurer's desk for excos), `members`. Modals: `compose`, `new-event`, `pay`, `record-transfer`, `set-account`, `new-appeal`, `notifications`, `profile`, `payment-complete`.

### Server functions (`supabase/functions/`)

| Function | Called by | Does |
|---|---|---|
| `paystack-init` | app | Works out the amount server-side, creates the payment row, starts Paystack checkout with the set's subaccount |
| `paystack-callback` | Paystack | Redirects the browser back to `icaosa://payment-complete` |
| `paystack-verify` | app | Confirms a payment with Paystack when the member returns |
| `paystack-webhook` | Paystack | Confirms payments (signature-checked), notifies payer and excos |
| `set-account` | app (excos) | Lists banks, resolves account names, creates/updates the set's Paystack subaccount |
| `notify` | app | Pushes new posts, events and appeals to the set |
| `daily-reminders` | pg_cron | Birthdays, tomorrow's events, dues reminders on the 1st and 20th |
| `delete-account` | app | In-app account deletion (store requirement) |

### Who can do what (enforced in the database)

- Members read the whole directory, their own set's posts, events and appeals, and association-wide ones.
- Members post to their own set; only excos post announcements; only admins post association-wide.
- Members see only their own payments; excos see their set's; only excos confirm recorded transfers (`review_payment`).
- Nobody can promote themselves; only admins change roles.
- Paystack payments and set bank accounts are written only by server functions.

## Development

```sh
npm install
cp .env.example .env.local   # add your Supabase URL and publishable key
npx expo start               # UI work in Expo Go
npx tsc --noEmit && npx expo lint
```

Push notifications and the in-app Paystack browser need a real build (not Expo Go).
