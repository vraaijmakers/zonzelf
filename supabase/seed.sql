-- Seed data for local development (`supabase db reset` applies this
-- automatically). Reflects the actual roadmap as of 2026-08-20 (post
-- reprioritization) so the board isn't empty on first load. Safe to re-run
-- — it's insert-only against a table that starts empty in a fresh reset.
--
-- Keep this in sync with supabase/migrations/20260820000003_roadmap_priorities_update.sql
-- and 20260820000005_roadmap_battery_data_pipeline.sql, which apply the same
-- end state as incremental patches against an already-seeded environment
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

  -- Phase 2 — account & ops foundation
  (2, 'infrastructure', 'User dashboard shell',
   '/dashboard ("My Projects") does not exist yet. Needed before Live Monitoring can be un-disabled on the homepage.',
   'planned', 0, true, 72),

  (2, 'admin', 'Admin portal: scrapers, SEO, memberships, payments',
   'The remaining /admin sidebar sections beyond the roadmap board — currently "Soon" stubs in src/app/admin/layout.tsx.',
   'planned', 0, false, 74),

  (2, 'calculators', 'Battery spec data pipeline (scraper)',
   'battery_models table + scripts/scrape-*.ts. Collects real battery model specs (brand, capacity, voltage, DoD) from manufacturer sites so the battery calculator can eventually recommend "4x EG4 LL-S 100Ah" instead of just a kWh number. Rows land unpublished; an admin review step (part of the admin scrapers item) gates anything reaching a visitor. Started with EG4 only — robots.txt ruled out Renogy (explicitly disallows AI crawlers); SOK and Battle Born are next.',
   'in_development', 20, false, 76),

  -- Phase 3 — monitoring (pushed later, 2026-08-20: sequencing choice, not a
  -- change to differentiator #2 in the Blue Ocean Contract)
  (3, 'monitoring', 'Local monitoring agent',
   'Brand-agnostic MODBUS/serial agent (Python, runs on a Pi/PC) posting to /api/ingest. Differentiator #2.',
   'planned', 0, true, 80),

  (3, 'monitoring', 'Monitoring dashboard UI + /api/ingest',
   'The user-facing live monitoring screen and the ingest endpoint the local agent posts to. Depends on the dashboard shell.',
   'planned', 0, true, 82),

  -- Phase 4 — community (depends on monitoring data existing)
  (4, 'community', 'Community data aggregation',
   'Opt-in anonymized aggregate stats ("systems like yours averaged X peak sun hours"). Differentiator #3.',
   'planned', 0, true, 90);
