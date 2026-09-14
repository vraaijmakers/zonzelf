-- Surfaced 2026-08-21: the batteries guide's cold-charging warning for
-- LiFePO4 was accurate but too easy to skim past, and gave no way to check
-- whether a specific battery actually has the protection it's warning about.
-- The guide copy itself was fixed directly (see batteries/page.tsx). These
-- two items are the bigger, structural half of the same problem, deferred
-- rather than built inline:
--
-- - The onboarding item depends on nothing else and could be picked up any
--   time.
-- - The battery_models item is deliberately sequenced after the in-flight
--   scraper branch (Epoch/SOK/Enjoybot, feature/battery-scraper-*) lands —
--   adding columns and re-scraping while that branch is mid-flight on the
--   same table would collide with it for no reason.

insert into public.roadmap_items
  (phase, category, title, description, status, dev_percent_complete, is_public, display_order)
values
  (1, 'onboarding', 'Ask installation environment up front (cabin/house/boat/camper/unheated shed)',
   'A single early question — where is this system going? — unlocks environment-specific risk warnings we currently bury in guide prose and hope people read: cold-charge damage on LiFePO4 in an unheated shed, corrosion/vibration concerns on a boat, weight limits on a camper. Surface the relevant warnings inline wherever the answer is known, instead of listing every risk on every guide regardless of relevance.',
   'planned', 0, true, 91),

  (2, 'calculators', 'battery_models: track charge-temperature range and self-heating so vendor listings can flag cold-climate risk',
   'The battery calculator lists real vendor models (brand/model/capacity/price) but nothing about charge-temperature range or self-heating. Add those columns, have the scraper capture them where the source datasheet states it, and show an explicit "cold-charge protection: confirmed / not stated" badge per model instead of leaving users to go find the datasheet themselves. Sequence after the in-flight Epoch/SOK/Enjoybot scraper branch merges, not concurrently with it.',
   'planned', 0, true, 92);
