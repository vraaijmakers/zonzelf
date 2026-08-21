-- Seed data for local development (`supabase db reset` applies this
-- automatically). Reflects the actual roadmap as of 2026-08-20 (post
-- reprioritization) so the board isn't empty on first load. Safe to re-run
-- — it's insert-only against a table that starts empty in a fresh reset.
--
-- Keep this in sync with supabase/migrations/20260820000003_roadmap_priorities_update.sql,
-- 20260820000005_roadmap_battery_data_pipeline.sql, and
-- 20260821000002_roadmap_scraper_autonomy.sql, which apply the same end
-- state as incremental patches against an already-seeded environment
-- (migrations run before this file on a reset, so those migrations'
-- UPDATEs/INSERTs are no-ops here — the values below are written directly
-- instead).

insert into public.roadmap_items
  (phase, category, title, description, status, dev_percent_complete, is_public, display_order)
values
  -- Phase 0 — foundation
  (0, 'infrastructure', 'CLAUDE.md operating contract',
   'Blue Ocean Contract as a scope gate, locked design tokens, branch/version workflow, session-correction rules.',
   'in_production', 100, true, 10),

  (0, 'infrastructure', 'Branch workflow + CI',
   'develop/staging/main branch protection, GitHub Actions build+lint gate on every PR.',
   'in_production', 100, true, 20),

  (0, 'admin', 'Roadmap board + admin portal foundation',
   'Supabase auth, profiles/role table, gated /admin shell, this roadmap board (admin-only — reversed from public read partway through).',
   'in_test', 90, true, 30),

  (0, 'infrastructure', 'Design token pass',
   'Wire --zon-* tokens into globals.css and shadcn primitives; fix the circular --font-sans bug.',
   'in_test', 90, true, 40),

  (0, 'infrastructure', 'Legal foundation (disclaimer, terms, privacy)',
   'Disclaimer, Terms of Service, and Privacy Policy pages, linked from the footer and calculator pages. Marked in-code as a draft pending lawyer review.',
   'in_test', 80, true, 42),

  (0, 'infrastructure', 'Accessibility baseline + widget',
   'Form label associations, keyboard operability, skip link, jsx-a11y lint gate, plus a visitor-facing widget (text size, contrast, motion) and a self-assessed /accessibility statement.',
   'in_test', 85, true, 44),

  (0, 'infrastructure', 'Dead-link cleanup (nav, footer, homepage)',
   'Removed or disabled links to /resources and /dashboard, which did not exist yet; trimmed the homepage Popular Guides section to guides that actually have a page.',
   'in_test', 100, true, 46),

  (0, 'onboarding', 'Resources page (curated links)',
   'Built /resources: YouTube channels, community forums, and manufacturer docs, verified live before publishing rather than recalled from memory.',
   'in_test', 100, true, 48),

  (0, 'infrastructure', 'Staging environment',
   'Self-hosted Docker container behind nginx on the VPN-only staging box, auto-deployed from the staging branch. Shares the one Supabase project with local dev.',
   'in_production', 100, true, 50),

  (0, 'onboarding', 'Fix /guides index dead links',
   '5 of 6 cards on the guides index link to pages that do not exist yet (only Battery Types is real): depth-of-discharge, wiring, grounding, inverter-settings, glossary.',
   'planned', 0, true, 52),

  (0, 'infrastructure', 'Legal: real contact channel',
   'Disclaimer/terms/privacy/accessibility pages currently have a [TODO] instead of contact info — publishing "reach out via GitHub" is not usable for a non-technical visitor. Blocked on Vincent choosing a channel (email vs. contact form).',
   'planned', 0, false, 54),

  (0, 'infrastructure', 'Legal: confirm entity and jurisdiction',
   'Terms of Service governing-law section is an explicit TODO pending a confirmed legal entity and jurisdiction.',
   'planned', 0, false, 56),

  (0, 'infrastructure', 'Legal: professional review before production',
   'Disclaimer/terms/privacy content is a first draft written without a lawyer. Needs review by qualified counsel before ZonZelf relies on it in production.',
   'planned', 0, false, 58),

  -- Phase 1 — content completeness (onboarding differentiator)
  (1, 'onboarding', 'Guided beginner onboarding',
   'Plain-English explainers woven into guides and calculators, not a separate wizard. Differentiator #1.',
   'planned', 0, true, 60),

  (1, 'onboarding', 'Remaining guide pages',
   'wiring, depth-of-discharge, grounding, inverter-settings, glossary — currently only battery-types has a real page.',
   'planned', 0, true, 62),

  (1, 'infrastructure', 'Full accessibility audit',
   'Manual screen reader pass (VoiceOver/NVDA) across every page, a systematic color-contrast check beyond the pages already spot-checked, and testing with real assistive-technology users.',
   'planned', 0, true, 64),

  (1, 'onboarding', 'Guides: expertise-level profile field + filtering',
   'Add a skill_level column to profiles (beginner/intermediate/advanced), a place in account settings to set it, and use it to filter or reorder the /guides index — the "beginner" tags already exist on every guide card, this just closes the loop so a returning user sees their level first. Needs its own migration + RLS policy, same pattern as the existing role column.',
   'planned', 0, true, 63),

  (1, 'onboarding', 'Ask installation environment up front (cabin/house/boat/camper/unheated shed)',
   'A single early question — where is this system going? — unlocks environment-specific risk warnings we currently bury in guide prose and hope people read: cold-charge damage on LiFePO4 in an unheated shed, corrosion/vibration concerns on a boat, weight limits on a camper. Surface the relevant warnings inline wherever the answer is known, instead of listing every risk on every guide regardless of relevance.',
   'planned', 0, true, 91),

  -- Phase 2 — account & ops foundation
  (2, 'infrastructure', 'User dashboard shell',
   '/dashboard ("My Projects") does not exist yet. Needed before Live Monitoring can be un-disabled on the homepage.',
   'planned', 0, true, 72),

  (2, 'admin', 'Admin portal: SEO, memberships, payments',
   'The remaining /admin sidebar sections beyond the roadmap board and battery review — currently "Soon" stubs in src/app/admin/layout.tsx.',
   'planned', 0, false, 74),

  (2, 'admin', 'Admin: battery model review (approve/reject scraped rows)',
   'src/app/admin/batteries — lists battery_models rows pending review with automated sanity checks (capacity_kwh vs voltage x Ah, price/kWh and DoD range checks for the stated chemistry, multi-unit bundle detection from the model name, source-domain plausibility, near-duplicate grouping) shown as pass/warn/fail per row, plus approve/reject/unpublish actions. The checks catch scraper mistakes, not physics correctness — a human still opens source_url and spot-checks before approving. Same logic is meant to seed "Battery scraper: agent-assisted review" later.',
   'in_test', 90, false, 75),

  (2, 'calculators', 'Battery calculator: flag when the panel array can''t recharge the bank in the available sun',
   'The battery and panel calculators size storage (kWh) and generation (kWh/day) independently, but never check whether the charge current the array can actually deliver is enough to refill the battery bank within the site''s peak sun hours. A user can size a "correct" battery bank and a "correct" array and still end up under-charging every day. Add a check on the battery calculator (or a shared summary) comparing array output over peak sun hours against the daily kWh drawn from the battery, and warn when the recharge doesn''t close the loop.',
   'planned', 0, true, 90),

  (2, 'calculators', 'battery_models: track charge-temperature range and self-heating so vendor listings can flag cold-climate risk',
   'The battery calculator lists real vendor models (brand/model/capacity/price) but nothing about charge-temperature range or self-heating. Add those columns, have the scraper capture them where the source datasheet states it, and show an explicit "cold-charge protection: confirmed / not stated" badge per model instead of leaving users to go find the datasheet themselves. Sequence after the in-flight Epoch/SOK/Enjoybot scraper branch merges, not concurrently with it.',
   'planned', 0, true, 92),

  (2, 'calculators', 'Battery spec data pipeline (scraper)',
   'battery_models table + scripts/scrape-*.ts. Collects real battery model specs (brand, capacity, voltage, DoD) from manufacturer sites so the battery calculator can eventually recommend "4x EG4 LL-S 100Ah" instead of just a kWh number. Rows land unpublished; an admin review step (part of the admin scrapers item) gates anything reaching a visitor. Started with EG4 only — robots.txt ruled out Renogy (explicitly disallows AI crawlers); SOK and Battle Born are next.',
   'in_development', 20, false, 76),

  (2, 'calculators', 'Battery scraper: re-scrape scheduling + published-row review gate',
   'The upsert currently overwrites an already-published row''s data on every re-run with no re-review step — fix that first, since a scheduled job silently changing a live price/spec would break the "scraped data isn''t trusted until reviewed" rule. Then add a scheduled re-scrape (GitHub Actions, weekly/monthly — battery specs don''t change daily) for the three known brands (EG4, Victron, SunGoldPower). Scrapers are manual-only today.',
   'planned', 0, false, 77),

  -- Phase 3 — monitoring (pushed later, 2026-08-20: sequencing choice, not a
  -- change to differentiator #2 in the Blue Ocean Contract)
  (3, 'monitoring', 'Local monitoring agent',
   'Brand-agnostic MODBUS/serial agent (Python, runs on a Pi/PC) posting to /api/ingest. Differentiator #2.',
   'planned', 0, true, 80),

  (3, 'monitoring', 'Monitoring dashboard UI + /api/ingest',
   'The user-facing live monitoring screen and the ingest endpoint the local agent posts to. Depends on the dashboard shell.',
   'planned', 0, true, 82),

  (3, 'calculators', 'Battery scraper: brand discovery + LLM extraction',
   'Replace hand-written per-brand parsers with LLM extraction at scrape time (same pattern as /api/scan-label), so adding a brand stops requiring bespoke code — each of EG4/Victron/SunGoldPower needed real investigative work to get right, which doesn''t scale. A discovery step finds candidate brand sites; robots.txt is auto-checked and an AI-crawler disallow (ClaudeBot/GPTBot) auto-skips the brand, matching the Renogy precedent. A human still adds a new domain to a reviewed "cleared brands" list before its first scrape — Terms of Service often has no-scraping language robots.txt doesn''t capture, and that judgment call stays manual even as extraction and discovery automate.',
   'planned', 0, false, 85),

  (3, 'calculators', 'Battery scraper: agent-assisted review',
   'Second-pass automated reviewer (capacity_kwh matches voltage x Ah, source_url actually supports the scraped numbers, not a near-duplicate of an existing row) that runs before a human spot-check. Downstream of the publish decision rather than upstream of hitting an external site, so a wrong call has a much smaller blast radius than an autonomous scrape/discovery mistake. Human review stays in the loop until the agent is trusted; the admin review UI (see "Admin portal: scrapers...") is the human side of this either way.',
   'planned', 0, false, 86),

  -- Phase 4 — community (depends on monitoring data existing)
  (4, 'community', 'Community data aggregation',
   'Opt-in anonymized aggregate stats ("systems like yours averaged X peak sun hours"). Differentiator #3.',
   'planned', 0, true, 90);
