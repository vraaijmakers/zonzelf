-- The component catalogue: panels and inverters, scraped the way batteries are,
-- so the calculators can offer real products and the affiliate line has more
-- than batteries to link. See roadmap item "Component spec library: inverters
-- and panels".
--
-- SHAPE. One shared table for what every category has in common (who makes it,
-- what it is called, whether a human has published it) plus one typed spec
-- table per category. Chosen over a copy of battery_models per category so the
-- review gate, the listing/price logic and the admin catalogue are written
-- once; chosen over a jsonb spec blob because Voc, Isc and the MPPT window are
-- protection-register inputs and deserve real types and CHECK constraints.
-- battery_models stays where it is for now -- it is live on
-- /calculators/battery -- and moves in as a third category later.
--
-- MODELS AND LISTINGS ARE SEPARATE, which battery_models never managed. A
-- listing is one shop's product page: its URL, its price, how many units it
-- sells at once (a pallet of 36 panels is a listing of the same panel as the
-- single). One model can have many listings, so a second retailer adds an
-- affiliate link instead of forking the product -- the exact failure recorded
-- in "Battery scraper: key row identity on SKU, not source_url". Listing
-- identity is the retailer's own product id, never the URL, for the same
-- reason.
--
-- THE ADMISSION GATE, ENFORCED HERE rather than by convention. PANEL_PRESETS
-- and INVERTER_PRESETS only admit figures read off the manufacturer's own
-- datasheet. Scraped specs therefore land as CANDIDATES: a spec row records
-- where its numbers came from (spec_source) and carries verified_at, which only
-- an admin sets after opening the datasheet. A model cannot be published until
-- its spec row is verified -- the trigger at the bottom refuses it -- and the
-- scrapers never write to a verified spec row at all (scripts/lib/catalog-write.ts).
-- That replaces battery_model_revisions' proposal queue for specs: a verified
-- spec is not something a scrape gets to propose changes to.
--
-- WHY THE CEC LIST IS A CANDIDATE SOURCE AND NOT A VERIFIED ONE, found
-- 2026-09-30. The California Energy Commission's PV module list is lab-tested
-- data, not a transcription of the datasheet, and for the one panel this site
-- has verified by hand it DISAGREES with the datasheet in the direction that
-- matters: Sun Gold Power SG550WM, beta-Voc -0.35 %/degC on the manufacturer's
-- sheet, -0.259 %/degC on the CEC list (the same figure for the whole SG*WM
-- family, so one tested sample). The shallower CEC coefficient predicts less
-- cold-morning voltage and would allow more panels in series. Useful for
-- finding and pre-filling a panel; not something to size a string on unchecked.

create table public.component_models (
  id               bigint generated always as identity primary key,
  category         text not null check (category in ('panel', 'inverter')),
  brand            text not null,
  model            text not null,
  -- Manufacturer part number as printed (e.g. TSM-NE09RC.05). The join key to
  -- the CEC list and to a second retailer.
  mpn              text,
  mpn_key          text generated always as (
                     nullif(upper(regexp_replace(coalesce(mpn, ''), '[^A-Za-z0-9]', '', 'g')), '')
                   ) stored,
  -- The spec sheet the retailer links. Often the manufacturer's PDF, sometimes
  -- a retailer-hosted copy of it; the reviewer decides whether it is the
  -- manufacturer's document before verifying against it.
  spec_sheet_url   text,
  -- Vendor product photo, hotlinked. Admin decoration, as on battery_models.
  image_url        text,
  is_published     boolean not null default false,
  scraped_at       timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create unique index component_models_category_mpn_idx
  on public.component_models (category, mpn_key)
  where mpn_key is not null;

create index component_models_category_published_idx
  on public.component_models (category, is_published);

create trigger component_models_set_updated_at
  before update on public.component_models
  for each row execute function public.set_updated_at();

create table public.component_listings (
  id                   bigint generated always as identity primary key,
  component_model_id   bigint not null references public.component_models (id) on delete cascade,
  retailer             text not null,
  -- The retailer's own product id (BigCommerce product_id for Signature Solar).
  retailer_product_id  text not null,
  url                  text not null,
  title                text not null,
  -- Where the retailer files it, e.g. "All Products/Inverters/Off-Grid
  -- Inverters". Context for the reviewer; not trusted to classify a unit.
  retailer_category    text,
  -- Units per purchase at price_usd. 1 for a single panel, 36 for a pallet.
  pack_qty             integer not null default 1 check (pack_qty >= 1),
  -- Smallest order the shop accepts, in packs. Signature Solar sells some
  -- single panels ten at a time.
  min_order_qty        integer not null default 1 check (min_order_qty >= 1),
  price_usd            numeric check (price_usd >= 0),
  price_scraped_at     timestamptz,
  -- A price that moved too far on a PUBLISHED model to write in place (see
  -- src/lib/listing-price.ts). The live price_usd stays until an admin accepts
  -- or discards this.
  held_price_usd       numeric check (held_price_usd >= 0),
  held_at              timestamptz,
  scraped_at           timestamptz not null default now(),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (retailer, retailer_product_id)
);

create index component_listings_model_idx on public.component_listings (component_model_id);

create trigger component_listings_set_updated_at
  before update on public.component_listings
  for each row execute function public.set_updated_at();

-- Where a spec row's numbers came from. Only 'datasheet' is admissible for
-- publishing, and only once verified_at is set.
--   cec       CEC PV module list (lab-tested, see the header)
--   retailer  the shop's own spec fields (dimensions, cell type)
--   datasheet typed in or confirmed by an admin from the manufacturer's sheet

create table public.panel_specs (
  component_model_id  bigint primary key references public.component_models (id) on delete cascade,
  watts_stc           numeric check (watts_stc > 0),
  voc_stc             numeric check (voc_stc > 0),
  vmp_stc             numeric check (vmp_stc > 0),
  isc_stc             numeric check (isc_stc > 0),
  imp_stc             numeric check (imp_stc > 0),
  -- Temperature coefficients, %/degC. beta_voc must be negative.
  beta_voc_pct        numeric check (beta_voc_pct < 0),
  beta_vmp_pct        numeric,
  beta_pmax_pct       numeric check (beta_pmax_pct < 0),
  alpha_isc_pct       numeric,
  max_series_fuse_a   numeric check (max_series_fuse_a > 0),
  cells_in_series     integer check (cells_in_series > 0),
  -- The physical fields PanelSpec never had (roadmap: "Panel choice: form
  -- factor, granularity and the physical fields"). Weight is the MODULE's,
  -- never the shipping weight a shop prints next to it.
  length_mm           numeric check (length_mm > 0),
  width_mm            numeric check (width_mm > 0),
  thickness_mm        numeric check (thickness_mm > 0),
  weight_kg           numeric check (weight_kg > 0),
  cell_type           text,
  bifacial            boolean,
  spec_source         text not null check (spec_source in ('cec', 'retailer', 'datasheet')),
  -- The CEC row these electricals were copied from, when spec_source = 'cec'.
  cec_manufacturer    text,
  cec_model_number    text,
  verified_at         timestamptz,
  verified_by         uuid references auth.users (id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  check (vmp_stc is null or voc_stc is null or vmp_stc < voc_stc),
  check (imp_stc is null or isc_stc is null or imp_stc < isc_stc),
  -- Verified means the protection-register inputs are all present.
  check (verified_at is null or (
    watts_stc is not null and voc_stc is not null and vmp_stc is not null
    and isc_stc is not null and imp_stc is not null and beta_voc_pct is not null
    and spec_source = 'datasheet'
  ))
);

create trigger panel_specs_set_updated_at
  before update on public.panel_specs
  for each row execute function public.set_updated_at();

-- Mirrors InverterSpec in src/lib/inverter-sizing.ts. Retailers publish none of
-- this (Signature Solar's inverter pages carry only spec-sheet links), and the
-- CEC inverter list covers grid-support units only -- no EG4 6000XP, no
-- SPH8048P -- so inverter specs start empty and are filled at review.
create table public.inverter_specs (
  component_model_id  bigint primary key references public.component_models (id) on delete cascade,
  kind                text check (kind in ('hybrid', 'inverter-only', 'charge-controller')),
  ac_continuous_w     numeric check (ac_continuous_w > 0),
  ac_surge_w          numeric check (ac_surge_w > 0),
  ac_surge_seconds    numeric check (ac_surge_seconds > 0),
  dc_system_voltage   numeric check (dc_system_voltage > 0),
  pv_max_input_v      numeric check (pv_max_input_v > 0),
  mppt_min_v          numeric check (mppt_min_v > 0),
  mppt_max_v          numeric check (mppt_max_v > 0),
  mppt_start_v        numeric check (mppt_start_v > 0),
  mppt_count          integer check (mppt_count > 0),
  pv_max_power_w      numeric check (pv_max_power_w > 0),
  pv_max_current_a    numeric check (pv_max_current_a > 0),
  pv_max_isc_a        numeric check (pv_max_isc_a > 0),
  max_charge_current_a numeric check (max_charge_current_a > 0),
  spec_source         text not null check (spec_source in ('retailer', 'datasheet')),
  verified_at         timestamptz,
  verified_by         uuid references auth.users (id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  check (mppt_max_v is null or pv_max_input_v is null or mppt_max_v <= pv_max_input_v),
  check (mppt_min_v is null or mppt_max_v is null or mppt_min_v < mppt_max_v),
  check (verified_at is null or (
    kind is not null and ac_continuous_w is not null and dc_system_voltage is not null
    and pv_max_input_v is not null and mppt_min_v is not null and mppt_max_v is not null
    and mppt_count is not null and pv_max_current_a is not null
    and spec_source = 'datasheet'
  ))
);

create trigger inverter_specs_set_updated_at
  before update on public.inverter_specs
  for each row execute function public.set_updated_at();

-- The CEC PV module list, whole, as reference data (scripts/import-cec-pv.ts).
-- 22,186 rows from 287 manufacturers on 2026-09-30. Deliberately NOT inserted
-- into component_models: a candidate nobody can buy is noise in a review
-- queue. The retailer scrapers look panels up here by part number instead.
-- Dimensions exist for about a quarter of rows and for NONE listed since 2023,
-- so they are kept but not relied on; there is no weight column at all.
create table public.cec_pv_modules (
  manufacturer     text not null,
  model_number     text not null,
  -- model_number upper-cased, alphanumerics only, with any CEC {bracketed}
  -- suffix removed (the list's own note: it is not part of the part number).
  model_key        text not null,
  description      text,
  technology       text,
  bifacial         boolean,
  pmax_w           numeric,
  isc_a            numeric,
  voc_v            numeric,
  imp_a            numeric,
  vmp_v            numeric,
  noct_c           numeric,
  gamma_pmax_pct   numeric,
  alpha_isc_pct    numeric,
  beta_voc_pct     numeric,
  beta_vmp_pct     numeric,
  cells_in_series  integer,
  short_side_m     numeric,
  long_side_m      numeric,
  listed_on        date,
  -- The list's "***" note: being removed from eligible equipment.
  pending_removal  boolean not null default false,
  imported_at      timestamptz not null default now(),
  primary key (manufacturer, model_number)
);

create index cec_pv_modules_model_key_idx on public.cec_pv_modules (model_key);

-- ---------------------------------------------------------------------------
-- The publish gate
-- ---------------------------------------------------------------------------

create or replace function public.component_models_publish_gate()
returns trigger
language plpgsql
as $$
begin
  if new.is_published and (tg_op = 'INSERT' or not old.is_published) then
    if new.category = 'panel' and not exists (
      select 1 from public.panel_specs
      where component_model_id = new.id and verified_at is not null
    ) then
      raise exception 'component_models %: a panel cannot be published until its specs are verified against the manufacturer datasheet', new.id;
    end if;
    if new.category = 'inverter' and not exists (
      select 1 from public.inverter_specs
      where component_model_id = new.id and verified_at is not null
    ) then
      raise exception 'component_models %: an inverter cannot be published until its specs are verified against the manufacturer datasheet', new.id;
    end if;
  end if;
  return new;
end;
$$;

create trigger component_models_publish_gate
  before insert or update of is_published on public.component_models
  for each row execute function public.component_models_publish_gate();

-- ---------------------------------------------------------------------------
-- RLS and grants
-- ---------------------------------------------------------------------------

alter table public.component_models enable row level security;
alter table public.component_listings enable row level security;
alter table public.panel_specs enable row level security;
alter table public.inverter_specs enable row level security;
alter table public.cec_pv_modules enable row level security;

create policy "component_models: public reads published rows"
  on public.component_models for select using (is_published = true);
create policy "component_models: admins read all rows"
  on public.component_models for select using (public.is_admin());
create policy "component_models: admins write"
  on public.component_models for all
  using (public.is_admin()) with check (public.is_admin());

-- Listings and specs are public exactly when their model is.
create policy "component_listings: public reads listings of published models"
  on public.component_listings for select using (exists (
    select 1 from public.component_models m
    where m.id = component_model_id and m.is_published
  ));
create policy "component_listings: admins read all rows"
  on public.component_listings for select using (public.is_admin());
create policy "component_listings: admins write"
  on public.component_listings for all
  using (public.is_admin()) with check (public.is_admin());

create policy "panel_specs: public reads specs of published models"
  on public.panel_specs for select using (exists (
    select 1 from public.component_models m
    where m.id = component_model_id and m.is_published
  ));
create policy "panel_specs: admins read all rows"
  on public.panel_specs for select using (public.is_admin());
create policy "panel_specs: admins write"
  on public.panel_specs for all
  using (public.is_admin()) with check (public.is_admin());

create policy "inverter_specs: public reads specs of published models"
  on public.inverter_specs for select using (exists (
    select 1 from public.component_models m
    where m.id = component_model_id and m.is_published
  ));
create policy "inverter_specs: admins read all rows"
  on public.inverter_specs for select using (public.is_admin());
create policy "inverter_specs: admins write"
  on public.inverter_specs for all
  using (public.is_admin()) with check (public.is_admin());

-- Reference data for the review screen; no visitor reads it directly.
create policy "cec_pv_modules: admins read"
  on public.cec_pv_modules for select using (public.is_admin());

-- As battery_models.sql: RLS needs table-level grants underneath it, and this
-- project hands none out automatically. The scrapers write with service_role.
grant select on public.component_models, public.component_listings,
  public.panel_specs, public.inverter_specs to anon, authenticated;
grant insert, update, delete on public.component_models, public.component_listings,
  public.panel_specs, public.inverter_specs to authenticated;
grant select on public.cec_pv_modules to authenticated;
grant select, insert, update, delete on public.component_models, public.component_listings,
  public.panel_specs, public.inverter_specs, public.cec_pv_modules to service_role;
