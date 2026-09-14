-- Battery spec data pipeline. Foundation for the calculators to eventually
-- say "you need 4x EG4 LL-S 100Ah" instead of just "5.1 kWh" — see roadmap
-- item "Battery spec data pipeline (scraper)". Populated by scripts under
-- scripts/scrape-*.ts, run manually or via a scheduled job, never by the app
-- itself. Rows start unpublished; an admin reviews and flips is_published
-- before a row is safe to show a visitor (rule #9 — scraped data is not
-- trusted data until a human has looked at it).

create table public.battery_models (
  id             bigint generated always as identity primary key,
  brand          text not null,
  model          text not null,
  sku            text,
  chemistry      text not null check (chemistry in ('lifepo4', 'agm', 'gel', 'flooded')),
  voltage        numeric not null check (voltage > 0),
  capacity_ah    numeric not null check (capacity_ah > 0),
  capacity_kwh   numeric not null check (capacity_kwh > 0),
  dod_rated      smallint check (dod_rated between 1 and 100),
  price_usd      numeric check (price_usd >= 0),
  source_url     text not null unique,
  scraped_at     timestamptz not null default now(),
  is_published   boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index battery_models_chemistry_published_idx
  on public.battery_models (chemistry, is_published);

create trigger battery_models_set_updated_at
  before update on public.battery_models
  for each row execute function public.set_updated_at();

alter table public.battery_models enable row level security;

create policy "battery_models: public reads published rows"
  on public.battery_models for select
  using (is_published = true);

create policy "battery_models: admins read all rows"
  on public.battery_models for select
  using (public.is_admin());

create policy "battery_models: admins insert"
  on public.battery_models for insert
  with check (public.is_admin());

create policy "battery_models: admins update"
  on public.battery_models for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "battery_models: admins delete"
  on public.battery_models for delete
  using (public.is_admin());

-- Same reason as profiles.sql and roadmap_items.sql — RLS needs a
-- table-level GRANT underneath it, and this project doesn't hand those out
-- automatically for new tables. The scraper script writes through the
-- service-role key instead, which bypasses RLS and these grants entirely —
-- they exist here for the admin-review UI that will read/update through a
-- logged-in admin session.
grant select on public.battery_models to anon, authenticated;
grant insert, update, delete on public.battery_models to authenticated;
