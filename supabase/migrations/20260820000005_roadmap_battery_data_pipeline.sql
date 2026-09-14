-- Split the battery-data foundation out of the Phase 2 admin item. The
-- scraper + battery_models table don't need the admin review UI or the
-- dashboard shell to exist first — they're a background data-collection
-- track that can build up in parallel with everything else (2026-08-20
-- decision). The admin item keeps its original scope (the review/approve
-- screens); this new item tracks the pipeline underneath it.
--
-- Not public yet — this is backend plumbing a visitor can't see or use
-- until a calculator actually reads from it.

insert into public.roadmap_items
  (phase, category, title, description, status, dev_percent_complete, is_public, display_order)
values
  (2, 'calculators', 'Battery spec data pipeline (scraper)',
   'battery_models table + scripts/scrape-*.ts. Collects real battery model specs (brand, capacity, voltage, DoD) from manufacturer sites so the battery calculator can eventually recommend "4x EG4 LL-S 100Ah" instead of just a kWh number. Rows land unpublished; an admin review step (part of the admin scrapers item) gates anything reaching a visitor. Started with EG4 only — robots.txt ruled out Renogy (explicitly disallows AI crawlers); SOK and Battle Born are next.',
   'in_development', 20, false, 76);
