-- ICAOSA daily reminders: birthdays, tomorrow's events and dues reminders.
-- Run this ONCE in the Supabase SQL Editor, after:
--   1. enabling the "Cron" and "pg_net" integrations (Dashboard → Integrations), and
--   2. deploying the `daily-reminders` function.
-- Replace the two values marked REPLACE before running.

select vault.create_secret('https://REPLACE-WITH-PROJECT-REF.supabase.co', 'icaosa_project_url');
select vault.create_secret('REPLACE-WITH-YOUR-CRON_SECRET', 'icaosa_cron_secret');

-- Every day at 07:00 Lagos time (06:00 UTC).
select cron.schedule(
  'icaosa-daily-reminders',
  '0 6 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'icaosa_project_url')
           || '/functions/v1/daily-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'icaosa_cron_secret')
    ),
    body := jsonb_build_object('at', now())
  );
  $$
);

-- To check it is scheduled:   select * from cron.job;
-- To stop it:                 select cron.unschedule('icaosa-daily-reminders');
