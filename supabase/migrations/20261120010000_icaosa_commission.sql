-- ICAOSA: platform commission on Paystack payments.
-- On every Paystack payment to a set, the commission goes to the main Paystack
-- account (the business that runs the app); the set receives the rest.
--   association_percent  percentage of each payment (already exists), e.g. 2 = 2%
--   commission_flat      fixed naira amount added per payment, e.g. 50 = ₦50
alter table public.settings
  add column if not exists commission_flat int not null default 0 check (commission_flat between 0 and 100000);

-- Commission taken on each payment, in naira, for the operator's records.
alter table public.payments
  add column if not exists commission int not null default 0 check (commission >= 0);
