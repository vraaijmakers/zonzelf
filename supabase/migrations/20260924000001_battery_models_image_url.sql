-- A product photo for each battery, so /admin/batteries can be reviewed by
-- looking rather than by reading eleven numbers twice.
--
-- WHY. The review card names a likely duplicate ("Looks similar to 1 other row
-- already in the table") but gives the reviewer nothing to compare against —
-- no way to see the other row without leaving the page. Two 51.2V/280Ah EG4
-- WallMounts are the same four numbers whether they are the same battery or
-- the indoor and all-weather variants of it, and on 2026-09-21 the scheduled
-- run inserted a genuine duplicate of a published row that read exactly like
-- the false positive next to it. A photo separates those two cases in one
-- glance; the numbers never will.
--
-- WHAT GOES IN IT. The product page's own og:image, hotlinked from the vendor
-- (see scripts/lib/scrape-common.ts). Nothing is copied into Supabase storage:
-- these render on an admin-only page behind is_admin(), a handful of requests
-- a week, and a vendor's CDN is a more current source of that photo than a
-- copy of it would be. If images ever reach the public calculator, revisit —
-- both the hotlinking and the review gate below.
--
-- NOT A SCRAPED_FIELD, deliberately. Every other column a scraper writes goes
-- through the published-row review gate (src/lib/battery-revision.ts), which
-- turns a change on a live row into a proposal for a human. image_url is
-- outside that gate and is written in place, published or not, because:
--   1. it is admin-only decoration — it cannot mislead a visitor about what a
--      battery costs or holds, which is what the gate exists to protect; and
--   2. gating it would have queued an image-only proposal for all 21 published
--      rows on the very first run, burying the real proposals under them. A
--      review queue is exactly the thing this column is meant to make usable.
-- Publishing images to /calculators/battery changes point 1, and the column
-- should move into SCRAPED_FIELDS in the same change that does it.

alter table public.battery_models
  add column if not exists image_url text;

comment on column public.battery_models.image_url is
  'Vendor product photo (og:image), hotlinked, admin review only. Written in place by the scrapers — outside the SCRAPED_FIELDS review gate. See migration 20260924000001.';
