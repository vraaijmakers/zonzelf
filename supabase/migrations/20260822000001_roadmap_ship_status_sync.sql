-- Roadmap board audit, 2026-08-22: several items were already shipped in
-- code (or code had moved past the description) but the board still said
-- 'planned'. Verified against the actual repo before writing this, not
-- from memory:
--
-- - "Fix /guides index dead links" and "Remaining guide pages" were both
--   closed by the same commit (766cedf, PR #40, "feat: write the remaining
--   guide pages" — merged 2026-08-21). All 7 /guides/* routes return 200
--   (curled against the local dev server) and both the guides index
--   (src/app/guides/page.tsx) and the footer (src/components/layout/Footer.tsx)
--   already pointed at these slugs before this landed.
-- - "Battery spec data pipeline (scraper)" still says 'planned' work
--   underneath it (re-scrape scheduling + review gate — the upsert in
--   scripts/lib/scrape-common.ts still overwrites on source_url conflict
--   with no is_published guard, confirmed unchanged), but its own
--   description was stale: it only mentioned EG4 and named SOK/Battle Born
--   as "next", while scripts/scrape-victron.ts and
--   scripts/scrape-sungoldpower.ts (PR #29, "extend battery scraper to
--   Victron and SunGoldPower") have been merged and are wired into
--   package.json (scrape:eg4, scrape:victron, scrape:sungoldpower) for a
--   while. Correcting the description and bumping percent-complete; not
--   flipping status, since the scheduling/review-gate half is genuinely
--   still unbuilt.
-- - "battery_models: track charge-temperature range..." named
--   feature/battery-scraper-epoch-sok-enjoybot as an "in-flight" branch to
--   sequence after. Checked: that branch has zero commits beyond develop —
--   it was never actually started. Correcting the description so the next
--   person doesn't go looking for a branch to rebase onto. Still 'planned',
--   nothing to build here yet.
--
-- Keep in sync with supabase/seed.sql, same pattern as the other
-- incremental-patch migrations in this directory.

update public.roadmap_items
  set status = 'in_production',
      dev_percent_complete = 100,
      description = 'Shipped in 766cedf (PR #40): all 5 previously-missing guide pages now exist, so the guides index and footer links that pointed at them stop 404ing. Verified live — all 7 /guides/* routes return 200.'
  where title = 'Fix /guides index dead links';

update public.roadmap_items
  set status = 'in_production',
      dev_percent_complete = 100,
      description = 'Shipped in 766cedf (PR #40, "feat: write the remaining guide pages"): depth-of-discharge, wiring, grounding, inverter-settings, and glossary all exist and share the GuideChrome component with how-it-works and batteries. All 7 guide routes verified returning 200.'
  where title = 'Remaining guide pages';

update public.roadmap_items
  set dev_percent_complete = 45,
      description = 'battery_models table + scripts/scrape-*.ts. Collects real battery model specs (brand, capacity, voltage, DoD) from manufacturer sites so the battery calculator can eventually recommend "4x EG4 LL-S 100Ah" instead of just a kWh number. Rows land unpublished; an admin review step (see "Admin: battery model review") gates anything reaching a visitor. Three brands live: EG4, Victron, SunGoldPower (PR #29). Scraping stays manual-only — no scheduled re-run yet, and the upsert still overwrites an already-published row on every re-run with no re-review step (see "Battery scraper: re-scrape scheduling + published-row review gate", which is what remains planned here).'
  where title = 'Battery spec data pipeline (scraper)';

update public.roadmap_items
  set description = 'The battery calculator lists real vendor models (brand/model/capacity/price) but nothing about charge-temperature range or self-heating. Add those columns, have the scraper capture them where the source datasheet states it, and show an explicit "cold-charge protection: confirmed / not stated" badge per model instead of leaving users to go find the datasheet themselves. feature/battery-scraper-epoch-sok-enjoybot exists but has no commits beyond develop (2026-08-22 check) — it was never actually started, not "in-flight". No blocker to picking this up now.'
  where title = 'battery_models: track charge-temperature range and self-heating so vendor listings can flag cold-climate risk';
