-- What /admin/catalog needs from the catalogue schema
-- (20260930000001_component_catalog.sql), and the four hand-verified products.
--
-- 1. HIDE, DON'T DELETE. Deleting a scraped battery lets next week's run insert
--    it again (see the roadmap's battery-duplicates note); a catalogue row an
--    admin rejects must survive so the scraper finds it and leaves it alone.
--    A hidden model keeps its listings — the scraper still refreshes them,
--    harmlessly — and never publishes.
--
-- 2. THE GATE CLOSES FROM BOTH SIDES. The publish trigger stops an unverified
--    model going live. It did not stop the reverse: un-verifying (or deleting)
--    the spec row of a model that is already live. Both now raise, so the only
--    way to change a live model's specs is unpublish, re-verify, publish.
--
-- 3. SEEDED FROM THE PRESETS. PANEL_PRESETS and INVERTER_PRESETS hold four
--    products whose every figure was read off the manufacturer's own document
--    and passed panel-review.ts / inverter-review.ts (roadmap: "Component spec
--    library", admitted 2026-08-30). They go in VERIFIED but UNPUBLISHED:
--    publishing is still a human click. The EG4 6000XP is already in the
--    catalogue from the Signature Solar scrape, so it is matched by part
--    number and its spec row filled rather than a second model created. The
--    SG550WM's physical fields were read off the same datasheet on 2026-09-30.

alter table public.component_models
  add column if not exists is_hidden boolean not null default false,
  add column if not exists hidden_reason text;

alter table public.component_models
  add constraint component_models_hidden_not_published
  check (not (is_hidden and is_published));

create or replace function public.component_specs_unverify_guard()
returns trigger
language plpgsql
as $$
declare
  model_id bigint := coalesce(old.component_model_id, new.component_model_id);
begin
  if exists (select 1 from public.component_models where id = model_id and is_published) then
    if tg_op = 'DELETE' or (old.verified_at is not null and new.verified_at is null) then
      raise exception 'component_models %: unpublish it before un-verifying or removing its specs', model_id;
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger panel_specs_unverify_guard
  before update or delete on public.panel_specs
  for each row execute function public.component_specs_unverify_guard();

create trigger inverter_specs_unverify_guard
  before update or delete on public.inverter_specs
  for each row execute function public.component_specs_unverify_guard();

-- ---------------------------------------------------------------------------
-- Seed: the four hand-verified products
-- ---------------------------------------------------------------------------

insert into public.component_models (category, brand, model, mpn, spec_sheet_url)
values
  ('panel', 'Sun Gold Power', 'SG550WM 550W Monocrystalline Solar Panel', 'SG550WM',
   'https://cdn.shopify.com/s/files/1/0323/4090/2025/files/182Mono550W-SG550WM-20260720.pdf?v=1784537348'),
  ('inverter', 'Sun Gold Power', 'SPH8048P 8kW Split-Phase Hybrid Inverter', 'SPH8048P',
   'https://cdn.shopify.com/s/files/1/0323/4090/2025/files/SPH8-10KW_User_Manual_V1.3_20250909.pdf?v=1773649595'),
  ('inverter', 'Sun Gold Power', 'SPH10048P 10kW Split-Phase Hybrid Inverter', 'SPH10048P',
   'https://cdn.shopify.com/s/files/1/0323/4090/2025/files/SPH8-10KW_User_Manual_V1.3_20250909.pdf?v=1773649595'),
  ('inverter', 'EG4 Electronics', '6000XP Off-Grid Inverter', 'EG4HYB6K00V2',
   'https://eg4electronics.com/wp-content/uploads/2024/04/EG4-6000XP-Inverter-Spec-Sheet.pdf')
on conflict (category, mpn_key) where mpn_key is not null do nothing;

insert into public.panel_specs (
  component_model_id, watts_stc, voc_stc, vmp_stc, isc_stc, imp_stc,
  beta_voc_pct, beta_pmax_pct, alpha_isc_pct, max_series_fuse_a,
  length_mm, width_mm, thickness_mm, weight_kg, cell_type, bifacial,
  spec_source, verified_at
)
select id, 550, 49.7, 41.0, 14.03, 13.45,
       -0.35, -0.38, 0.06, 25,
       2278, 1134, 35, 28.3, 'Monocrystalline', false,
       'datasheet', '2026-08-30T00:00:00Z'
from public.component_models where category = 'panel' and mpn_key = 'SG550WM'
on conflict (component_model_id) do update set
  watts_stc = excluded.watts_stc, voc_stc = excluded.voc_stc, vmp_stc = excluded.vmp_stc,
  isc_stc = excluded.isc_stc, imp_stc = excluded.imp_stc, beta_voc_pct = excluded.beta_voc_pct,
  beta_pmax_pct = excluded.beta_pmax_pct, alpha_isc_pct = excluded.alpha_isc_pct,
  max_series_fuse_a = excluded.max_series_fuse_a, length_mm = excluded.length_mm,
  width_mm = excluded.width_mm, thickness_mm = excluded.thickness_mm, weight_kg = excluded.weight_kg,
  cell_type = excluded.cell_type, bifacial = excluded.bifacial,
  spec_source = excluded.spec_source, verified_at = excluded.verified_at;

insert into public.inverter_specs (
  component_model_id, kind, ac_continuous_w, ac_surge_w, ac_surge_seconds, dc_system_voltage,
  pv_max_input_v, mppt_min_v, mppt_max_v, mppt_start_v, mppt_count, pv_max_power_w,
  pv_max_current_a, pv_max_isc_a, max_charge_current_a, spec_source, verified_at
)
select m.id, v.kind, v.ac_w, v.surge_w, v.surge_s, 48,
       v.pv_max_v, v.mppt_min, v.mppt_max, v.mppt_start, 2, v.pv_w,
       v.pv_a, v.pv_isc, v.charge_a, 'datasheet', '2026-08-30T00:00:00Z'
from (values
  ('SPH8048P',     'hybrid', 8000,  16000, null::numeric, 500, 125, 425, null::numeric, 11000, 22, null::numeric, 180),
  ('SPH10048P',    'hybrid', 10000, 20000, null,          500, 125, 425, null,          11000, 22, null,          200),
  ('EG4HYB6K00V2', 'hybrid', 6000,  12000, 3.5,           480, 120, 385, 100,           8000,  17, 25,            125)
) as v(mpn_key, kind, ac_w, surge_w, surge_s, pv_max_v, mppt_min, mppt_max, mppt_start, pv_w, pv_a, pv_isc, charge_a)
join public.component_models m on m.category = 'inverter' and m.mpn_key = v.mpn_key
on conflict (component_model_id) do update set
  kind = excluded.kind, ac_continuous_w = excluded.ac_continuous_w, ac_surge_w = excluded.ac_surge_w,
  ac_surge_seconds = excluded.ac_surge_seconds, dc_system_voltage = excluded.dc_system_voltage,
  pv_max_input_v = excluded.pv_max_input_v, mppt_min_v = excluded.mppt_min_v,
  mppt_max_v = excluded.mppt_max_v, mppt_start_v = excluded.mppt_start_v,
  mppt_count = excluded.mppt_count, pv_max_power_w = excluded.pv_max_power_w,
  pv_max_current_a = excluded.pv_max_current_a, pv_max_isc_a = excluded.pv_max_isc_a,
  max_charge_current_a = excluded.max_charge_current_a,
  spec_source = excluded.spec_source, verified_at = excluded.verified_at;
