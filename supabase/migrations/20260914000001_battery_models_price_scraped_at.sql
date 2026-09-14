-- WHY A SECOND TIMESTAMP. battery_models.scraped_at dates the row's SPECS, and
-- specs and price do not come from the same place: the manufacturer's page
-- states voltage/capacity/DoD and no price (see scripts/scrape-eg4.ts, which
-- sends price_usd: null), while a reseller scrape fills the price in on a row
-- another scraper created (scripts/scrape-signaturesolar.ts). One column
-- therefore cannot date both.
--
-- THE FAILURE THIS EXISTS TO PREVENT, found 2026-09-14. Signature Solar
-- delisted the EG4 LL-S 48V 100AH. The row kept $1,536.99 — a price nothing
-- can re-confirm and, worse, nothing can clear: diffScrapedFields() ignores a
-- null patch value on purpose ("silence is not a correction"), so a scrape
-- that finds no price never wipes a good one. Meanwhile the EG4 scrape kept
-- re-confirming the SPECS, so scraped_at advanced to that very morning. The
-- row looked freshly checked while /calculators/battery multiplied the dead
-- price into a bank total in its largest type. Stamping scraped_at next to
-- that price would have put the current date on it and made it worse.
--
-- NULL MEANS UNDATED, NOT STALE, and existing rows are deliberately left that
-- way rather than backfilled from scraped_at — that would invent a date the
-- project does not have, which is the bug above in a different costume. An
-- undated price still renders (it is what the site shows today, so hiding it
-- would be a regression to pay for a migration); it simply carries no "as of"
-- line. Every priced row dates itself on the next successful weekly run.
--
-- Not added to SCRAPED_FIELDS: like scraped_at, this is metadata about a
-- scrape rather than a scraped value, so it must never appear in a proposal
-- or be diffed. See src/lib/battery-revision.ts.

alter table public.battery_models
  add column if not exists price_scraped_at timestamptz;

comment on column public.battery_models.price_scraped_at is
  'When price_usd was last confirmed by a scrape. NULL = undated (predates the column, or never priced). Distinct from scraped_at, which dates the specs.';
