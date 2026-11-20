-- ICAOSA: the association's own (national) bank account.
-- Stored in public.sets as year 0. Association-wide appeals are paid into it
-- through its Paystack subaccount, never into the app operator's account.
alter table public.sets drop constraint if exists sets_year_check;
alter table public.sets add constraint sets_year_check check (year = 0 or year between 1950 and 2100);
