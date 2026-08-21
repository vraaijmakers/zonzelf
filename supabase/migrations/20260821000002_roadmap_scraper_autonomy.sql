-- Captures the 2026-08-21 direction on scraper autonomy: move from manual,
-- hand-written-per-brand scripts toward scheduled re-scraping of known
-- brands, then brand discovery + LLM extraction for new ones, then
-- agent-assisted review — each stage only after the one before it is
-- trusted. Not public — this is backend tooling roadmap, same as the
-- admin scrapers and battery data pipeline items it extends.

insert into public.roadmap_items
  (phase, category, title, description, status, dev_percent_complete, is_public, display_order)
values
  (2, 'calculators', 'Battery scraper: re-scrape scheduling + published-row review gate',
   'The upsert currently overwrites an already-published row''s data on every re-run with no re-review step — fix that first, since a scheduled job silently changing a live price/spec would break the "scraped data isn''t trusted until reviewed" rule. Then add a scheduled re-scrape (GitHub Actions, weekly/monthly — battery specs don''t change daily) for the three known brands (EG4, Victron, SunGoldPower). Scrapers are manual-only today.',
   'planned', 0, false, 77),

  (3, 'calculators', 'Battery scraper: brand discovery + LLM extraction',
   'Replace hand-written per-brand parsers with LLM extraction at scrape time (same pattern as /api/scan-label), so adding a brand stops requiring bespoke code — each of EG4/Victron/SunGoldPower needed real investigative work to get right, which doesn''t scale. A discovery step finds candidate brand sites; robots.txt is auto-checked and an AI-crawler disallow (ClaudeBot/GPTBot) auto-skips the brand, matching the Renogy precedent. A human still adds a new domain to a reviewed "cleared brands" list before its first scrape — Terms of Service often has no-scraping language robots.txt doesn''t capture, and that judgment call stays manual even as extraction and discovery automate.',
   'planned', 0, false, 85),

  (3, 'calculators', 'Battery scraper: agent-assisted review',
   'Second-pass automated reviewer (capacity_kwh matches voltage x Ah, source_url actually supports the scraped numbers, not a near-duplicate of an existing row) that runs before a human spot-check. Downstream of the publish decision rather than upstream of hitting an external site, so a wrong call has a much smaller blast radius than an autonomous scrape/discovery mistake. Human review stays in the loop until the agent is trusted; the admin review UI (see "Admin portal: scrapers...") is the human side of this either way.',
   'planned', 0, false, 86);
