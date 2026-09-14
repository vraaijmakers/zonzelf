-- First of the two jobs this item named: EG4 pricing. See scrape-signaturesolar.ts.
--
-- Keep in sync with supabase/seed.sql (CI enforces this).

update public.roadmap_items
  set status = 'in_development',
      dev_percent_complete = 15,
      description = 'Affiliate is the primary revenue line, and the catalogue cannot currently carry it. All three EG4 models now have a price and a retailer, captured from Signature Solar (scripts/scrape-signaturesolar.ts, a hand-verified SKU-to-URL mapping — the storefront splits "Indoor" and "AllWeather" variants of the same capacity into separate products, so a naive title match would have picked the wrong one half the time). battery_models gained retailer and retailer_url columns rather than overwriting source_url, which stays the manufacturer spec citation. The three rows were written back unpublished, because filling in a price on an already-published row is exactly the risk "Battery scraper: re-scrape scheduling + published-row review gate" describes — they wait in /admin/batteries for a human to re-approve alongside the rest of that queue. Remaining: Victron (10 models, no direct affiliate programme, editorial only) and widening the vendor mix toward Signature Solar, SunGoldPower, Renogy, A1 Solar Store, and Bluetti. The FTC affiliate-disclosure item must still land before any of these links go live.'
  where title = 'Battery catalogue: price coverage and vendor mix for affiliate';
