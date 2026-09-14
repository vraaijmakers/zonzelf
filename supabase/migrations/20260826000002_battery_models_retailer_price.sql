-- battery_models.source_url is the manufacturer spec citation (voltage,
-- capacity, DoD) and must not be overwritten by a retailer's product page —
-- see "Battery catalogue: price coverage and vendor mix for affiliate".
-- Price and the eventual affiliate link come from a reseller instead, so they
-- need their own columns rather than reusing source_url.

alter table public.battery_models
  add column if not exists retailer text,
  add column if not exists retailer_url text;
