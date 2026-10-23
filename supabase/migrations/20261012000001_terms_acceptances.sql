-- Terms acceptance records, and the account deletion path that lets sign-ups
-- reopen.
--
-- 1. WHY A TABLE. The protection steps of the sizing chain (array wiring, cable
--    and fuse sizing, commissioning) now sit behind an account, and an account
--    needs a ticked "I agree" against a specific version of the terms. A footer
--    link is weak evidence of assent; a row saying who agreed to which version,
--    and when, is the evidence. See CLAUDE.md, "Legal posture".
--
-- 2. THE SERVER WRITES THE EVIDENCE, NOT THE BROWSER. user_id and accepted_at
--    are filled by column defaults, and `authenticated` is granted INSERT on
--    terms_version alone. A signed-in caller can record that they agreed; they
--    cannot back-date it or record it for someone else. There is no UPDATE and
--    no DELETE grant: a record is append-only for as long as the account lives.
--
-- 3. DELETION REMOVES THE RECORD TOO. The row cascades with the account, which
--    is what the privacy policy promises. Whether an acceptance should instead
--    outlive its account for the limitation period (GDPR art. 17(3)(e) allows
--    keeping data needed to defend a legal claim) is a question for counsel, and
--    the answer changes this one line.
--
-- 4. delete_own_account() IS THE DELETION PATH. Sign-ups were closed on the
--    roadmap item "GDPR: account deletion path, or stop collecting emails"
--    because there was no way to honour a deletion request without an operator.
--    Deleting a row from auth.users needs more than the anon key can do, and
--    rule 9 keeps the service-role key out of the app, so this is a SECURITY
--    DEFINER function that can only ever remove the caller's own row. An admin
--    is refused: the site must not be left without one by a mis-click, and an
--    admin account is removed by hand.

create table if not exists public.terms_acceptances (
  id            bigint generated always as identity primary key,
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  terms_version text not null check (terms_version <> ''),
  accepted_at   timestamptz not null default now(),
  unique (user_id, terms_version)
);

alter table public.terms_acceptances enable row level security;

drop policy if exists "terms_acceptances: read own rows" on public.terms_acceptances;
create policy "terms_acceptances: read own rows"
  on public.terms_acceptances for select
  using (auth.uid() = user_id);

drop policy if exists "terms_acceptances: admins read all rows" on public.terms_acceptances;
create policy "terms_acceptances: admins read all rows"
  on public.terms_acceptances for select
  using (public.is_admin());

drop policy if exists "terms_acceptances: record own acceptance" on public.terms_acceptances;
create policy "terms_acceptances: record own acceptance"
  on public.terms_acceptances for insert
  with check (auth.uid() = user_id);

-- "Automatically expose new tables" is off on this project, so nothing is
-- reachable until it is granted here. INSERT is column-level on purpose: see 2.
grant select on public.terms_acceptances to authenticated;
grant insert (terms_version) on public.terms_acceptances to authenticated;

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null then
    raise exception 'not signed in';
  end if;

  if exists (select 1 from public.profiles where id = caller and role = 'admin') then
    raise exception 'an admin account is removed by hand, not from the account page';
  end if;

  -- profiles and terms_acceptances cascade; verified_by / reviewed_by on the
  -- catalogue tables are ON DELETE SET NULL.
  delete from auth.users where id = caller;
end;
$$;

revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
