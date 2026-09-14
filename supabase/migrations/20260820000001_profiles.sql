-- Profiles: one row per auth.users row, carries the app role.
-- role starts at 'user' for everyone. There is no self-serve way to become
-- 'admin' — the first admin is promoted by hand in the SQL editor after
-- signing up once. See CLAUDE.md, "Bootstrapping the first admin".

create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  role       text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

-- security definer so this can be called from RLS policies on other tables
-- (including profiles itself) without recursing back into profiles' own RLS.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

create policy "profiles: read own row"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: admins read all rows"
  on public.profiles for select
  using (public.is_admin());

create policy "profiles: admins update roles"
  on public.profiles for update
  using (public.is_admin())
  with check (public.is_admin());

-- RLS policies alone don't grant access — Postgres checks the table-level
-- GRANT first. This project has "Automatically expose new tables" off (a
-- deliberate lockdown), so every new table needs this written explicitly.
-- Without it, requireAdmin()'s own-row lookup in src/lib/admin.ts returns
-- permission-denied and silently redirects every admin away from /admin.
grant select, update on public.profiles to authenticated;
