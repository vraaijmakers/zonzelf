-- Signature Solar delisted the EG4 LL-S 48V 100AH (hard 404, no redirect, and
-- gone from their EG4 brand page — it moved nowhere). The row kept $1,536.99,
-- which /calculators/battery multiplied by unit count into a bank total in the
-- largest type on the shelf.
--
-- No scraper can undo this. diffScrapedFields() ignores a null patch value on
-- purpose ("silence is not a correction"), so a scrape that finds no price
-- never wipes a good one — which also means a price whose retailer disappears
-- is frozen until a human clears it. That is this file.
--
-- THE ROW STAYS PUBLISHED. EG4 still makes the battery, and its source_url —
-- the manufacturer spec page, which is what the public card actually links —
-- was re-confirmed live (HTTP 200) by the same run that caught this. Only the
-- commerce data died, so only the commerce data goes. The card falls back to
-- "Price not published", already handled.
--
-- Values being cleared, for the record and for reversal:
--   price_usd    1536.99
--   retailer     'Signature Solar'
--   retailer_url 'https://signaturesolar.com/eg4-ll-s-lithium-battery-48v-100ah-server-rack-battery-ul1973-ul9540a-10-year-warranty'
--
-- Keyed on sku + retailer_url rather than id so it is safe on any database:
-- where the row does not exist, or has already been cleared, it matches
-- nothing. Idempotent — re-running finds no retailer_url to match.

update public.battery_models
   set price_usd    = null,
       retailer     = null,
       retailer_url = null
 where sku = 'EG4LL48V100AV4'
   and retailer_url = 'https://signaturesolar.com/eg4-ll-s-lithium-battery-48v-100ah-server-rack-battery-ul1973-ul9540a-10-year-warranty';
