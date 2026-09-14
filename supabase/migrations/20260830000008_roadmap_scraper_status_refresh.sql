-- Roadmap audit, 2026-08-30, prompted by reviewing the now-stale PR #44
-- ("docs(roadmap): sync board status with what is actually shipped",
-- opened 2026-08-22). That PR's own findings were accurate for their date,
-- but were not merged: one of the four items it touched has since been
-- fixed more thoroughly by 20260829000001, and merging #44's version would
-- have overwritten that fix with a less rigorous, week-old one. The other
-- three findings are folded in here instead, refreshed against today's repo
-- rather than replayed verbatim.
--
-- "Fix /guides index dead links" is deliberately NOT touched here — it is
-- already 'in_test'/100% via 20260829000001, verified by enumerating every
-- internal /guides/* link rather than curling routes, and that is the more
-- careful record.
--
-- Keep in sync with supabase/seed.sql (CI enforces this).

update public.roadmap_items
  set status = 'in_test',
      dev_percent_complete = 100,
      description = 'Shipped in 766cedf (PR #40, "feat: write the remaining guide pages"): depth-of-discharge, wiring, grounding, inverter-settings, and glossary all exist and share the GuideChrome component with how-it-works and batteries. This item sat at planned for over a week after the work that closed it had shipped, because writing the guides dissolved it rather than anyone completing it as scoped -- the same drift "Fix /guides index dead links" had, and that item''s fix (20260829000001) is the more careful record: verified by enumerating every internal /guides/* link across src/, not just curling the seven routes.'
  where title = 'Remaining guide pages';

update public.roadmap_items
  set dev_percent_complete = 55,
      description = 'battery_models table + scripts/scrape-*.ts. Collects real battery model specs (brand, capacity, voltage, DoD) from manufacturer sites so the battery calculator can eventually recommend "4x EG4 LL-S 100Ah" instead of just a kWh number. Rows land unpublished; an admin review step (part of the admin scrapers item) gates anything reaching a visitor. Five scrapers live and wired into package.json: EG4, Victron, SunGoldPower, Signature Solar and A1 SolarStore (scrape:eg4, scrape:victron, scrape:sungoldpower, scrape:signaturesolar, scrape:a1solarstore) — Renogy was ruled out by robots.txt, which explicitly disallows AI crawlers. Scraping stays manual-only: no scheduled re-run, and the upsert in scripts/lib/scrape-common.ts still overwrites an already-published row on conflict with no re-review step (see "Battery scraper: re-scrape scheduling + published-row review gate", which is what remains planned here). A weekly cloud routine to extend this same pipeline to inverters and panels is scheduled separately once repo access for it is connected.'
  where title = 'Battery spec data pipeline (scraper)';

update public.roadmap_items
  set description = 'The battery calculator lists real vendor models (brand/model/capacity/price) but nothing about charge-temperature range or self-heating. Add those columns, have the scraper capture them where the source datasheet states it, and show an explicit "cold-charge protection: confirmed / not stated" badge per model instead of leaving users to go find the datasheet themselves. feature/battery-scraper-epoch-sok-enjoybot does not exist on origin — checked 2026-08-22 and again 2026-08-30, eight days apart, with the same result both times. It was never "in-flight"; stop citing it as a branch to sequence after. No blocker to picking this up now.'
  where title = 'battery_models: track charge-temperature range and self-heating so vendor listings can flag cold-climate risk';
