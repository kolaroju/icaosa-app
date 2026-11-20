-- ICAOSA: let signed-in members and the server functions use the tables.
-- Newer Supabase projects no longer grant table access automatically.
-- Row Level Security (in the first migration) still decides which rows each person can see or change.

grant usage on schema public to authenticated, service_role;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;

grant execute on all functions in schema public to authenticated, service_role;

-- Tables added later get the same access.
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant all on tables to service_role;
