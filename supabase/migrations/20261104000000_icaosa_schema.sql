-- ICAOSA: Ibadan City Academy Old Students Association
-- Database schema, access rules (Row Level Security) and helper functions.
-- Run once on a new Supabase project (Dashboard → SQL Editor, or `supabase db push`).

-------------------------------------------------------------------------------
-- Members
-------------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null check (char_length(full_name) between 2 and 120),
  set_year    int  not null check (set_year between 1950 and 2100),
  bd_day      smallint check (bd_day between 1 and 31),
  bd_month    smallint check (bd_month between 1 and 12),
  phone       text check (char_length(phone) <= 30),
  city        text check (char_length(city) <= 80),
  occupation  text check (char_length(occupation) <= 80),
  role        text not null default 'member' check (role in ('member', 'exco', 'admin')),
  notify      jsonb not null default '{"birthdays": true, "events": true, "posts": true, "dues": true}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint birthday_pair check ((bd_day is null) = (bd_month is null))
);
create index profiles_set_year_idx on public.profiles (set_year);

-- Helper functions used by the access rules. SECURITY DEFINER so they can read
-- profiles without recursing into the profiles policies.
create or replace function public.my_set() returns int
language sql stable security definer set search_path = public as $$
  select set_year from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false)
$$;

-- True for association admins, and for excos of set `y`. `y` null means the
-- whole association, which only admins manage.
create or replace function public.is_exco_of(y int) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select role = 'admin' or (role = 'exco' and y is not null and set_year = y)
    from public.profiles where id = auth.uid()
  ), false)
$$;

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- Members cannot promote themselves. Only an admin (or the SQL editor /
-- server code, where auth.uid() is null) can change a role.
create or replace function public.guard_profile_role() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null and not public.is_admin() then
    raise exception 'Only an association admin can change member roles';
  end if;
  return new;
end $$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger profiles_guard_role before update on public.profiles
  for each row execute function public.guard_profile_role();

alter table public.profiles enable row level security;
create policy "Members can see the association directory" on public.profiles
  for select to authenticated using (true);
create policy "People create their own member profile" on public.profiles
  for insert to authenticated with check (id = auth.uid() and role = 'member');
create policy "Members edit their own profile; admins edit anyone" on public.profiles
  for update to authenticated using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-------------------------------------------------------------------------------
-- Association settings (one row) and per-set dues + bank account
-------------------------------------------------------------------------------
create table public.settings (
  id                  boolean primary key default true check (id),
  -- Share of every set payment that goes to the central ICAOSA Paystack account.
  association_percent numeric(5, 2) not null default 0 check (association_percent between 0 and 100),
  -- Who pays Paystack's fee on set payments: 'subaccount' (the set) or 'account' (ICAOSA).
  fees_bearer         text not null default 'subaccount' check (fees_bearer in ('account', 'subaccount'))
);
insert into public.settings default values;
alter table public.settings enable row level security;
create policy "Members can read association settings" on public.settings
  for select to authenticated using (true);

create table public.sets (
  year                int primary key check (year between 1950 and 2100),
  dues_amount         int not null default 0 check (dues_amount >= 0), -- naira per month
  bank_code           text,
  bank_name           text,
  account_number      text check (account_number ~ '^[0-9]{10}$'),
  account_name        text,
  paystack_subaccount text,
  updated_by          uuid references public.profiles (id) on delete set null,
  updated_at          timestamptz not null default now()
);
alter table public.sets enable row level security;
-- Written only by the `set-account` server function, which checks the account with Paystack.
create policy "Members can read set dues and accounts" on public.sets
  for select to authenticated using (true);

-------------------------------------------------------------------------------
-- Feed posts (news, invites, announcements, birthday wishes)
-------------------------------------------------------------------------------
create table public.posts (
  id          uuid primary key default gen_random_uuid(),
  set_year    int, -- null = whole association
  kind        text not null check (kind in ('news', 'invite', 'announcement', 'celebration')),
  title       text not null check (char_length(title) between 1 and 140),
  body        text check (char_length(body) <= 4000),
  event_date  date,
  venue       text check (char_length(venue) <= 160),
  author_id   uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now()
);
create index posts_set_created_idx on public.posts (set_year, created_at desc);
alter table public.posts enable row level security;
create policy "Members see their set's posts and association posts" on public.posts
  for select to authenticated using (set_year is null or set_year = public.my_set() or public.is_admin());
create policy "Members post to their own set; admins post to the association" on public.posts
  for insert to authenticated with check (
    author_id = auth.uid() and (
      (set_year = public.my_set() and (kind <> 'announcement' or public.is_exco_of(set_year)))
      or (set_year is null and public.is_admin())
    ));
create policy "Authors and excos remove posts" on public.posts
  for delete to authenticated using (author_id = auth.uid() or public.is_exco_of(set_year));

-------------------------------------------------------------------------------
-- Events and RSVPs
-------------------------------------------------------------------------------
create table public.events (
  id          uuid primary key default gen_random_uuid(),
  set_year    int, -- null = whole association
  title       text not null check (char_length(title) between 1 and 140),
  starts_on   date not null,
  start_time  time,
  venue       text check (char_length(venue) <= 160),
  details     text check (char_length(details) <= 3000),
  author_id   uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now()
);
create index events_set_date_idx on public.events (set_year, starts_on);
alter table public.events enable row level security;
create policy "Members see their set's events and association events" on public.events
  for select to authenticated using (set_year is null or set_year = public.my_set() or public.is_admin());
create policy "Members add events to their set; admins to the association" on public.events
  for insert to authenticated with check (
    author_id = auth.uid() and (set_year = public.my_set() or (set_year is null and public.is_admin())));
create policy "Authors and excos edit events" on public.events
  for update to authenticated using (author_id = auth.uid() or public.is_exco_of(set_year));
create policy "Authors and excos remove events" on public.events
  for delete to authenticated using (author_id = auth.uid() or public.is_exco_of(set_year));

create table public.rsvps (
  event_id    uuid not null references public.events (id) on delete cascade,
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  status      text not null check (status in ('going', 'maybe', 'no')),
  updated_at  timestamptz not null default now(),
  primary key (event_id, user_id)
);
alter table public.rsvps enable row level security;
create policy "Members see RSVPs for events they can see" on public.rsvps
  for select to authenticated using (exists (select 1 from public.events e where e.id = event_id));
create policy "Members RSVP for themselves" on public.rsvps
  for insert to authenticated with check (user_id = auth.uid() and exists (select 1 from public.events e where e.id = event_id));
create policy "Members change their own RSVP" on public.rsvps
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Members withdraw their own RSVP" on public.rsvps
  for delete to authenticated using (user_id = auth.uid());

-------------------------------------------------------------------------------
-- Donation appeals
-------------------------------------------------------------------------------
create table public.appeals (
  id          uuid primary key default gen_random_uuid(),
  set_year    int, -- null = whole association
  title       text not null check (char_length(title) between 1 and 120),
  details     text check (char_length(details) <= 3000),
  target      int not null check (target > 0), -- naira
  closed      boolean not null default false,
  author_id   uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now()
);
alter table public.appeals enable row level security;
create policy "Members see their set's appeals and association appeals" on public.appeals
  for select to authenticated using (set_year is null or set_year = public.my_set() or public.is_admin());
create policy "Excos start appeals for their set; admins for the association" on public.appeals
  for insert to authenticated with check (author_id = auth.uid() and public.is_exco_of(set_year));
create policy "Excos close or edit their appeals" on public.appeals
  for update to authenticated using (public.is_exco_of(set_year)) with check (public.is_exco_of(set_year));

-------------------------------------------------------------------------------
-- Payments: dues and donations, by Paystack or recorded bank transfer
-------------------------------------------------------------------------------
create table public.payments (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references public.profiles (id) on delete set null,
  set_year          int, -- the set the money belongs to; null = association
  kind              text not null check (kind in ('dues', 'donation')),
  months            text[] not null default '{}', -- 'YYYY-MM' for dues
  appeal_id         uuid references public.appeals (id) on delete set null,
  amount            int not null check (amount > 0), -- naira
  method            text not null check (method in ('paystack', 'transfer')),
  status            text not null default 'pending'
                    check (status in ('initialized', 'pending', 'confirmed', 'failed', 'rejected')),
  reference         text unique,
  paystack_channel  text,
  paid_at           timestamptz,
  paid_on           date,
  note              text check (char_length(note) <= 300),
  reviewed_by       uuid references public.profiles (id) on delete set null,
  reviewed_at       timestamptz,
  created_at        timestamptz not null default now(),
  constraint dues_have_months check (kind <> 'dues' or cardinality(months) between 1 and 24),
  constraint months_format check (array_to_string(months, ',') ~ '^([0-9]{4}-(0[1-9]|1[0-2])(,|$))*$')
);
create index payments_user_idx on public.payments (user_id, created_at desc);
create index payments_set_idx on public.payments (set_year, status);
create index payments_appeal_idx on public.payments (appeal_id) where status = 'confirmed';

-- A month can only be paid once: block new dues that overlap a pending or
-- confirmed payment for the same member.
create or replace function public.guard_dues_months() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.kind = 'dues' and new.status in ('initialized', 'pending', 'confirmed') and exists (
    select 1 from public.payments p
    where p.user_id = new.user_id and p.kind = 'dues' and p.id <> new.id
      and p.status in ('pending', 'confirmed') and p.months && new.months
  ) then
    raise exception 'Some of these months are already paid or awaiting confirmation';
  end if;
  return new;
end $$;
create trigger payments_guard_months before insert on public.payments
  for each row execute function public.guard_dues_months();

alter table public.payments enable row level security;
create policy "Members see their own payments; excos see their set's" on public.payments
  for select to authenticated using (user_id = auth.uid() or public.is_exco_of(set_year));
-- Paystack payments are created by the `paystack-init` server function. Members
-- can only record a bank transfer they already made, which waits for an exco.
create policy "Members record their own bank transfers" on public.payments
  for insert to authenticated with check (
    user_id = auth.uid() and method = 'transfer' and status = 'pending'
    and reviewed_by is null and reference is null
    and set_year is not distinct from (
      case when appeal_id is null then public.my_set()
           else (select a.set_year from public.appeals a where a.id = appeal_id and not a.closed) end)
    and (kind = 'donation' or appeal_id is null));

-- Excos confirm or reject a recorded transfer for their set.
create or replace function public.review_payment(p_id uuid, p_approve boolean) returns void
language plpgsql security definer set search_path = public as $$
declare
  p public.payments;
begin
  select * into p from public.payments where id = p_id for update;
  if not found then raise exception 'Payment not found'; end if;
  if not public.is_exco_of(p.set_year) then
    raise exception 'Only an exco of this set can confirm its payments';
  end if;
  if p.method <> 'transfer' or p.status <> 'pending' then
    raise exception 'This payment is not waiting for confirmation';
  end if;
  update public.payments
     set status = case when p_approve then 'confirmed' else 'rejected' end,
         reviewed_by = auth.uid(), reviewed_at = now(),
         paid_at = case when p_approve then now() else null end
   where id = p_id;
end $$;

-- Money raised per appeal (members can't read each other's payments directly).
create or replace function public.appeal_totals()
returns table (appeal_id uuid, raised bigint, donors int)
language sql stable security definer set search_path = public as $$
  select p.appeal_id, sum(p.amount)::bigint, count(distinct p.user_id)::int
  from public.payments p
  join public.appeals a on a.id = p.appeal_id
  where p.status = 'confirmed'
    and (a.set_year is null or a.set_year = public.my_set() or public.is_admin())
  group by p.appeal_id
$$;

-- How many members of the caller's set have paid dues for a month ('YYYY-MM').
create or replace function public.set_dues_summary(p_month text)
returns table (members int, paid int)
language sql stable security definer set search_path = public as $$
  select
    (select count(*)::int from public.profiles where set_year = public.my_set()),
    (select count(distinct p.user_id)::int from public.payments p
       join public.profiles m on m.id = p.user_id
      where m.set_year = public.my_set() and p.kind = 'dues'
        and p.status = 'confirmed' and p_month = any (p.months))
$$;

-------------------------------------------------------------------------------
-- Push notification tokens
-------------------------------------------------------------------------------
create table public.push_tokens (
  token       text primary key,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  platform    text check (platform in ('ios', 'android')),
  updated_at  timestamptz not null default now()
);
create index push_tokens_user_idx on public.push_tokens (user_id);
alter table public.push_tokens enable row level security;
create policy "Members see their own devices" on public.push_tokens
  for select to authenticated using (user_id = auth.uid());
create policy "Members remove their own devices" on public.push_tokens
  for delete to authenticated using (user_id = auth.uid());

-- A phone may change hands between accounts, so registration always moves the
-- token to the person now signed in.
create or replace function public.register_push_token(p_token text, p_platform text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  insert into public.push_tokens (token, user_id, platform, updated_at)
  values (p_token, auth.uid(), p_platform, now())
  on conflict (token) do update set user_id = excluded.user_id, platform = excluded.platform, updated_at = now();
end $$;

-------------------------------------------------------------------------------
-- Grants: signed-in members use the API through the rules above.
-------------------------------------------------------------------------------
revoke all on function public.review_payment(uuid, boolean) from public, anon;
revoke all on function public.register_push_token(text, text) from public, anon;
revoke all on function public.appeal_totals() from public, anon;
revoke all on function public.set_dues_summary(text) from public, anon;
grant execute on function public.review_payment(uuid, boolean) to authenticated;
grant execute on function public.register_push_token(text, text) to authenticated;
grant execute on function public.appeal_totals() to authenticated;
grant execute on function public.set_dues_summary(text) to authenticated;
