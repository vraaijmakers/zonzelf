-- Roadmap re-prioritization, 2026-08-20 session: design-system/font fix, legal
-- pages, accessibility baseline + widget, roadmap admin-gating, dead-link
-- cleanup, and the Resources page all shipped as open PRs; monitoring is
-- deliberately pushed later (sequencing choice, not a change to the Blue
-- Ocean Contract's differentiator #2 — see CLAUDE.md).
--
-- Incremental patch for an already-seeded environment (e.g. staging, which
-- won't get a fresh `supabase db reset`): updates existing rows by title
-- (safe no-op if a title doesn't match) and inserts the newly identified
-- backlog. Keep in sync with supabase/seed.sql, which encodes this same end
-- state directly for a fresh local reset — migrations run before seed.sql,
-- so these UPDATEs would be no-ops against an empty table there.

update public.roadmap_items
  set status = 'in_test', dev_percent_complete = 90,
      description = 'Supabase auth, profiles/role table, gated /admin shell, this roadmap board (admin-only — reversed from public read partway through).'
  where title = 'Roadmap board + admin portal foundation';

update public.roadmap_items
  set status = 'in_test', dev_percent_complete = 90
  where title = 'Design token pass';

-- Monitoring and the community layer that depends on it move later.
update public.roadmap_items
  set phase = 3
  where title = 'Local monitoring agent';

update public.roadmap_items
  set phase = 4
  where title = 'Community data aggregation';

insert into public.roadmap_items
  (phase, category, title, description, status, dev_percent_complete, is_public, display_order)
values
  -- Phase 0 — shipped today, open PRs pending merge
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

  -- Phase 0 — trust/honesty gaps identified today, not started
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

  -- Phase 3 — monitoring (pushed later per 2026-08-20 direction)
  (3, 'monitoring', 'Monitoring dashboard UI + /api/ingest',
   'The user-facing live monitoring screen and the ingest endpoint the local agent posts to. Depends on the dashboard shell.',
   'planned', 0, true, 82);
