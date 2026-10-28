-- Batteries join the component catalogue as a third category, so every
-- component is reviewed in one place (roadmap: "Admin: component catalogue",
-- the battery_models move it deferred).
--
-- WHAT MOVES AND WHAT DOES NOT. This migration is SCHEMA only. The rows move in
-- scripts/migrate-batteries-to-catalogue.ts, which replays each battery_models
-- row through the same writer the battery scrapers now use — so the listing ids
-- it creates are the ids next week's scrape will look for, rather than ids a
-- SQL copy guessed. battery_models and battery_model_revisions are left in
-- place, read-only by convention, until the switch-over has run a week: they
-- are the rollback.
--
-- VERIFIED MEANS WHAT IT MEANS FOR PANELS. A battery's specs are verified once
-- an admin has checked them against the manufacturer's own page or sheet. The
-- 26 batteries already published were approved exactly that way under
-- /admin/batteries ("open source_url, spot-check, approve"), so the
-- carry-over marks them verified rather than sending them back to review.
--
-- ONE THING THE BATTERY GATE DID THAT THE CATALOGUE DID NOT. A re-scrape of a
-- published battery whose page now says something different became a
-- proposal. The catalogue never writes a verified spec row, which on its own
-- would make such a change disappear. So the disagreement is recorded on the
-- model instead (spec_disagreement), shown in /admin/catalog, and cleared by
-- re-verifying. Nothing a visitor sees changes until a human acts.

alter table public.component_models drop constraint component_models_category_check;
alter table public.component_models
  add constraint component_models_category_check check (category in ('panel', 'inverter', 'battery'));

-- What a scrape found that differs from verified specs: {"field": {"verified": x, "scraped": y}}.
alter table public.component_models
  add column if not exists spec_disagreement jsonb,
  add column if not exists spec_disagreement_at timestamptz;

create table public.battery_specs (
  component_model_id  bigint primary key references public.component_models (id) on delete cascade,
  chemistry           text check (chemistry in ('lifepo4', 'agm', 'gel', 'flooded')),
  voltage             numeric check (voltage > 0),
  capacity_ah         numeric check (capacity_ah > 0),
  capacity_kwh        numeric check (capacity_kwh > 0),
  dod_rated           smallint check (dod_rated between 1 and 100),
  -- manufacturer: read off the maker's own page or sheet by a scraper (EG4,
  --               Victron, Sun Gold Power, the hand-verified Discover row)
  -- retailer:     a shop's spec table
  -- datasheet:    confirmed by an admin — the only verifiable source
  spec_source         text not null check (spec_source in ('manufacturer', 'retailer', 'datasheet')),
  verified_at         timestamptz,
  verified_by         uuid references auth.users (id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  check (verified_at is null or (
    chemistry is not null and voltage is not null and capacity_ah is not null
    and capacity_kwh is not null and spec_source = 'datasheet'
  ))
);

create trigger battery_specs_set_updated_at
  before update on public.battery_specs
  for each row execute function public.set_updated_at();

create trigger battery_specs_unverify_guard
  before update or delete on public.battery_specs
  for each row execute function public.component_specs_unverify_guard();

create index battery_specs_chemistry_idx on public.battery_specs (chemistry);

-- The publish gate, now with batteries.
create or replace function public.component_models_publish_gate()
returns trigger
language plpgsql
as $$
begin
  if new.is_published and (tg_op = 'INSERT' or not old.is_published) then
    if new.category = 'panel' and not exists (
      select 1 from public.panel_specs where component_model_id = new.id and verified_at is not null
    ) then
      raise exception 'component_models %: a panel cannot be published until its specs are verified against the manufacturer datasheet', new.id;
    end if;
    if new.category = 'inverter' and not exists (
      select 1 from public.inverter_specs where component_model_id = new.id and verified_at is not null
    ) then
      raise exception 'component_models %: an inverter cannot be published until its specs are verified against the manufacturer datasheet', new.id;
    end if;
    if new.category = 'battery' and not exists (
      select 1 from public.battery_specs where component_model_id = new.id and verified_at is not null
    ) then
      raise exception 'component_models %: a battery cannot be published until its specs are verified against the manufacturer datasheet', new.id;
    end if;
  end if;
  return new;
end;
$$;

alter table public.battery_specs enable row level security;

create policy "battery_specs: public reads specs of published models"
  on public.battery_specs for select using (exists (
    select 1 from public.component_models m
    where m.id = component_model_id and m.is_published
  ));
create policy "battery_specs: admins read all rows"
  on public.battery_specs for select using (public.is_admin());
create policy "battery_specs: admins write"
  on public.battery_specs for all
  using (public.is_admin()) with check (public.is_admin());

grant select on public.battery_specs to anon, authenticated;
grant insert, update, delete on public.battery_specs to authenticated;
grant select, insert, update, delete on public.battery_specs to service_role;
