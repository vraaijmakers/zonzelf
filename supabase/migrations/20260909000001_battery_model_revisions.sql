-- The published-row review gate for the battery scraper.
--
-- battery_models rows land unpublished and an admin flips is_published only
-- after opening source_url and looking (rule 9's data-side twin: scraped data
-- is not trusted data until a human has looked at it). The upsert in
-- scripts/lib/scrape-common.ts broke that on the SECOND run of any scraper:
-- `on conflict (source_url) do update` wrote the freshly scraped voltage,
-- capacity and price straight over the row while is_published stayed true --
-- so a live row's numbers changed with nobody in the loop. /calculators/battery
-- lists exactly those rows, which makes this a trust bug rather than a backlog
-- item, and it is the reason the re-scrape schedule was never turned on.
--
-- The same overwrite already had a second victim: scrape-eg4.ts emits
-- `price_usd: null` (EG4's own site never lists a price), and
-- scrape-signaturesolar.ts fills that price in from the reseller. Re-running
-- the EG4 scraper wiped the affiliate price -- the field the primary revenue
-- line depends on -- off all three EG4 rows every time.
--
-- Fix, in two halves. This table is the state; scripts/lib/scrape-common.ts and
-- /admin/batteries are the behaviour:
--
--   unpublished row -> the scraper still writes in place. Nothing is live, so
--                      there is nothing to protect, and the row is already
--                      sitting in the review queue.
--   published row   -> the scrape lands HERE as a proposal. The live row is not
--                      touched until an admin applies it.
--
-- `proposed` is jsonb rather than a mirror of battery_models' columns because a
-- proposal is a PATCH, not a row: scrape-signaturesolar.ts proposes only
-- price_usd/retailer/retailer_url, and nullable mirror columns could not tell
-- "proposes null" apart from "has no opinion on this field". `previous` is the
-- same keys as they stood when the proposal was made, so an applied or rejected
-- revision still reads as a diff months later.
--
-- is_published is deliberately NOT a field a proposal can carry (see
-- SCRAPED_FIELDS in src/lib/battery-revision.ts, which the apply action filters
-- through). Publication is a human decision; a scrape must never be able to
-- propose one.

create table if not exists public.battery_model_revisions (
  id                bigint generated always as identity primary key,
  battery_model_id  bigint not null references public.battery_models (id) on delete cascade,
  -- The changed fields only, normalized: {"price_usd": 1683.4}
  proposed          jsonb not null,
  -- The same keys as the live row held at proposal time.
  previous          jsonb not null default '{}'::jsonb,
  -- Which scraper produced it, e.g. 'signaturesolar'. A price disagreement
  -- reads very differently depending on whether it came from the manufacturer
  -- or the reseller.
  source            text not null,
  -- superseded: the row was unpublished and written in place while this
  -- proposal was still open, so it describes a state that no longer exists.
  -- It was neither accepted nor refused, and saying either would be a lie.
  status            text not null default 'pending'
                    check (status in ('pending', 'applied', 'rejected', 'superseded')),
  scraped_at        timestamptz not null default now(),
  reviewed_at       timestamptz,
  reviewed_by       uuid references auth.users (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- At most one OPEN proposal per battery. A weekly re-scrape that still
-- disagrees replaces its own earlier proposal instead of stacking a fresh copy
-- behind it every run -- a review queue that grows by one row per battery per
-- week is a review queue nobody reads.
create unique index if not exists battery_model_revisions_one_pending_idx
  on public.battery_model_revisions (battery_model_id)
  where status = 'pending';

create index if not exists battery_model_revisions_model_status_idx
  on public.battery_model_revisions (battery_model_id, status);

drop trigger if exists battery_model_revisions_set_updated_at on public.battery_model_revisions;
create trigger battery_model_revisions_set_updated_at
  before update on public.battery_model_revisions
  for each row execute function public.set_updated_at();

alter table public.battery_model_revisions enable row level security;

-- No anon policy at all, deliberately. battery_models has one because
-- published rows are public; a revision is by definition data no human has
-- accepted yet, so there is no version of this table a visitor should see.
create policy "battery_model_revisions: admins read"
  on public.battery_model_revisions for select
  using (public.is_admin());

create policy "battery_model_revisions: admins insert"
  on public.battery_model_revisions for insert
  with check (public.is_admin());

create policy "battery_model_revisions: admins update"
  on public.battery_model_revisions for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "battery_model_revisions: admins delete"
  on public.battery_model_revisions for delete
  using (public.is_admin());

-- Same reason as battery_models.sql -- RLS needs a table-level GRANT
-- underneath it and this project doesn't hand those out for new tables. The
-- scrapers write through the service-role key and bypass both; these exist for
-- the admin review UI reading through a logged-in admin session. anon is
-- granted nothing.
grant select, insert, update, delete on public.battery_model_revisions to authenticated;
