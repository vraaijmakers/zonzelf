-- EG4 moved the WallMount 280Ah All Weather product page:
--   old  .../categories/batteries/eg4-wallmount-all-weather-battery/
--   new  .../categories/batteries/wpower-16-280-aw-powerpro-wallmount-all-weather/
--
-- upsertBatteries() keys row identity on source_url, so the 2026-09-14 run
-- found no match and INSERTED a second row rather than proposing an update to
-- the live one. Two rows then shared sku EG4LL48V100AODWMBV2: the published,
-- priced original and an unpublished duplicate sitting in the review queue.
-- Applying that duplicate in /admin/batteries would have published the same
-- battery twice on /calculators/battery, and it gave
-- scrape-signaturesolar.ts — which matches on sku — two rows to write to.
--
-- ROOT CAUSE, not fixed here: source_url is both the match key AND a member of
-- SCRAPED_FIELDS, so the gate can never propose a source_url change. A moved
-- page always forks a row. Keying identity on sku would fix the class; that is
-- a bigger change than a data repair and is tracked separately.
--
-- The duplicate being deleted, for the record and for reversal:
--   brand EG4 · model 'WallMount 280Ah All Weather Battery'
--   sku EG4LL48V100AODWMBV2 · chemistry lifepo4
--   51.2 V · 280 Ah · 14.34 kWh · dod_rated 80
--   price_usd NULL · retailer NULL · retailer_url NULL · is_published false
--   source_url <the new URL below> · created_at 2026-09-14T12:55:06.927819+00
-- Every value except source_url and the timestamps is identical to the row
-- that survives, which is what made it safe to drop rather than merge.
--
-- Content-keyed, so on a database where these rows do not exist both
-- statements match nothing. Idempotent: after one run the delete finds no
-- unpublished row and the update finds no old source_url.

-- DELETE FIRST. source_url is unique, so the surviving row cannot take the new
-- URL while the duplicate still holds it.
delete from public.battery_models
 where sku          = 'EG4LL48V100AODWMBV2'
   and is_published = false
   and source_url   = 'https://eg4electronics.com/categories/batteries/wpower-16-280-aw-powerpro-wallmount-all-weather/';

-- Then point the live row at the page that actually exists, so the next EG4
-- run matches it and proposes changes instead of forking a third row.
update public.battery_models
   set source_url = 'https://eg4electronics.com/categories/batteries/wpower-16-280-aw-powerpro-wallmount-all-weather/'
 where sku          = 'EG4LL48V100AODWMBV2'
   and is_published = true
   and source_url   = 'https://eg4electronics.com/categories/batteries/eg4-wallmount-all-weather-battery/';
