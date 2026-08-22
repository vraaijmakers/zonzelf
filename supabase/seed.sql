-- Seed data for local development (`supabase db reset` applies this
-- automatically). Reflects the actual roadmap as of 2026-08-21 (post
-- production-audit re-prioritization) so the board isn't empty on first
-- load. Safe to re-run — it's insert-only against a table that starts
-- empty in a fresh reset.
--
-- Keep this in sync with supabase/migrations/20260820000003_roadmap_priorities_update.sql,
-- 20260820000005_roadmap_battery_data_pipeline.sql,
-- 20260821000002_roadmap_scraper_autonomy.sql,
-- 20260821000003_roadmap_guide_personalization_and_charge_rate.sql,
-- 20260821000004_roadmap_climate_risk_awareness.sql,
-- 20260821000005_roadmap_battery_review_ui.sql,
-- 20260821000006_roadmap_calculator_persistence_note.sql, and
-- 20260821000007_roadmap_production_audit.sql, which apply the same end
-- state as incremental patches against an already-seeded environment
-- (migrations run before this file on a reset, so those migrations'
-- UPDATEs/INSERTs are no-ops here — the values below are written directly
-- instead).

insert into public.roadmap_items
  (phase, category, title, description, status, dev_percent_complete, is_public, display_order)
values
  -- Phase 0 — foundation (shipped)
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
   'Wire --zon-* tokens into globals.css and shadcn primitives; circular --font-sans is fixed. Remaining debt: calculators, battery guide, admin, and legal pages still use raw yellow-* / gray-* utilities (~90 yellow and ~130 gray class usages). New views must use tokens; converting the leftover pages is this item, not a side effect of the next feature.',
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

  -- Phase 0 — production gate (2026-08-21 audit). Sorted in the order they
  -- should be picked up: educational safety first (people buy cable and
  -- flatten batteries from these numbers), then "don't 404", then legal,
  -- then security/platform. Nothing on public zonzelf.com DNS until this
  -- cluster is honestly in_production.

  (0, 'calculators', 'Calculators: correct inverter cutoff voltages',
   'Fixed: the battery calculator invented its own LVD numbers (12.0V for 12V LiFePO4 at 80% DoD — actually near-empty) instead of using the ones already correct in /guides/depth-of-discharge. Calculator now shares src/lib/battery-chemistry.ts with that guide and gives chemistry-specific copy (lithium: use the BMS, voltage is not a reliable proxy; lead-acid: resting-voltage band, explicit sag-under-load warning) instead of one invented number. Still blocked on the separate "licensed electrician/engineer sign-off" item before this counts as reviewed.',
   'in_test', 90, true, 51),

  (0, 'calculators', 'Calculators: AWG ampacity from a cited electrical code',
   'The AWG table uses chassis-wiring ratings (AWG 10 = 55A, AWG 12 = 41A). NEC 310.16 / typical THHN in conduit is ~30A / 20A; NEN 1010 / IEC 60364 are the relevant codes for the EU/NL audience. max_amps_bundle exists in the table and is unused. No insulation type, temperature, bundling, DC vs AC, or fuse-must-protect-the-wire. Voltage-drop math is fine; the recommendation is not. Default to the conservative (in-conduit / code) table, or offer chassis vs in-conduit as two modes. Cite the source on the page.',
   'planned', 0, true, 52),

  (0, 'calculators', 'Calculators: appliance presets use duty cycle, not nameplate × 24h',
   'Full-size fridge preset is 150W × 24h = 3.6 kWh/day; real cycling is typically 1–2 kWh. Mini fridge 80W × 24h is the same class of error. One row can double a beginner''s battery and panel bill. Use average/duty-cycle watts for cycling loads, and say so. Motor surge is explained in a sidebar and never enters a number — that is the separate inverter-sizing item, not this one.',
   'planned', 0, true, 53),

  (0, 'calculators', 'Calculators: one efficiency model across load / battery / panels',
   'Three different stories today. Load calculator publishes adjustedKwh = raw / efficiency and tells the user to use that number for battery AND panel sizing. Battery calculator uses adjustedKwh (good) then ignores the per-chemistry battery.efficiency field (defined, never applied). Panel calculator uses rawKwh then applies its own efficiency (correct, to avoid double-counting). Pick one model, make the copy match the math, and add a test so the three pages cannot drift again.',
   'planned', 0, true, 54),

  (0, 'calculators', 'Calculators: peak sun hours are annual averages — say so',
   'The regional presets (Netherlands 2.5h, etc.) are annual figures. December in NL is closer to 1h. No worst-month, no tilt, no shading. Fine as a first estimate if the page says so; currently it does not. Label them annual, and offer a worst-month input so a beginner does not size an array that only works in June.',
   'planned', 0, true, 55),

  (0, 'calculators', 'Calculators: demote "Recommended" copy until engineer-reviewed',
   'Result cards say "Recommended gauge" / "Recommended bank" in large green type. Combined with chassis ampacity and wrong LVD numbers, that reads as a specification, not a starting estimate. Until the electrician/engineer sign-off item is done, the UI should say "rough starting estimate — do not buy from this number" with the same visual weight as the number itself. Product-liability item; pairs with the disclaimer, does not replace it.',
   'planned', 0, true, 56),

  (0, 'calculators', 'Calculators: licensed electrician/engineer sign-off',
   'Production gate. A licensed electrician or solar engineer reviews the four calculators (formulas, AWG source table, LVD table, fridge/AC presets, efficiency model) against NEC/NEN 1010/IEC 60364 and manufacturer chemistry data. This is domain review, not the lawyer review of the legal pages. Do not put zonzelf.com in public DNS as an educational product until this has happened.',
   'planned', 0, true, 57),

  (0, 'calculators', 'Battery calculator: flag when the panel array can''t recharge the bank in the available sun',
   'Production gate for the calculator suite. The battery and panel calculators size storage (kWh) and generation (kWh/day) independently, but never check whether the array can actually refill the bank within the site''s peak sun hours. A user can size a "correct" battery bank and a "correct" array and still end up under-charging every day. Add a check on the battery calculator (or a shared summary) comparing array output over peak sun hours against the daily kWh drawn from the battery, and warn when the recharge doesn''t close the loop. Surfaced in the how-it-works guide; originally filed as phase 2 and pulled forward by the 2026-08-21 audit.',
   'planned', 0, true, 58),

  (0, 'onboarding', 'Fix /guides index dead links',
   'Guides index still cards 5 pages that do not exist (depth-of-discharge, wiring, grounding, inverter-settings, glossary). Footer links wiring/grounding/glossary. Battery guide links /guides/depth-of-discharge twice. how-it-works has since shipped — leave that card. Production gate: do not index or footer-link a guide until its page exists. Writing the missing guides is the separate "Remaining guide pages" item.',
   'planned', 0, true, 59),

  (0, 'infrastructure', 'Legal: real contact channel',
   'Disclaimer/terms/privacy/accessibility pages currently have a [TODO] instead of contact info — publishing "reach out via GitHub" is not usable for a non-technical visitor. Blocked on Vincent choosing a channel (email vs. contact form).',
   'planned', 0, false, 60),

  (0, 'infrastructure', 'Legal: confirm entity and jurisdiction',
   'Terms of Service governing-law section is an explicit TODO pending a confirmed legal entity and jurisdiction.',
   'planned', 0, false, 61),

  (0, 'infrastructure', 'Legal: professional review before production',
   'Disclaimer/terms/privacy/accessibility are a first draft, not lawyer-reviewed, and currently show [TODO] placeholders to visitors. Before production, counsel must review: governing law and legal entity, liability language vs the confidence of calculator "Recommended" copy, GDPR/AVG (lawful basis, processor list including Supabase + Anthropic vision for /api/scan-label, retention, US transfers, cookie assessment, DSR channel), and consumer-law risk of advertising Pro/subscriptions/monitoring that do not exist yet. Visible TODOs must be gone before zonzelf.com is public.',
   'planned', 0, false, 62),

  (0, 'infrastructure', 'Auth: sanitize the next= redirect (open redirect)',
   'src/app/auth/login/page.tsx and signup do redirect(next) with an unsanitized query param. next=https://evil.com is a phishing vector on a magic-link product. The callback concatenates origin+next (safer) but still does not require a same-origin relative path. Allow only paths that start with a single slash and do not start with //.',
   'planned', 0, false, 63),

  (0, 'infrastructure', 'Gate /api/scan-label (auth, rate limit, size, privacy)',
   'The route is an unauthenticated paid LLM endpoint: any client can POST an image, no auth, no rate limit, no file-size cap, no MIME allowlist. The UI pretends it is Pro-gated with `const isPro = false`; the API is not. Either auth-gate + rate-limit + size-limit it, or delete the route until Pro exists. Privacy policy must disclose that nameplate photos go to Anthropic. Household images are personal data under GDPR.',
   'planned', 0, false, 64),

  (0, 'infrastructure', 'Separate staging and production Supabase projects',
   'Staging currently shares the one Supabase project with local dev (see the Staging environment item). If production keeps that model, staging scrapes, admin clicks, and test accounts live in the same database as real users. Split projects before collecting real emails. Migrations must be applied to both.',
   'planned', 0, false, 65),

  (0, 'infrastructure', 'GDPR: account deletion path, or stop collecting emails',
   'Signup is live. Privacy policy promises users can delete their account and associated data; there is no dashboard and no deletion flow. Either ship a working DSR/deletion path (and a reachable contact — see Legal: real contact channel) or take signup off the public nav until there is something an account is for. Collecting emails with no purpose and no deletion is an AVG finding the day the domain is public.',
   'planned', 0, true, 66),

  (0, 'infrastructure', 'Unit tests for calculator math and battery-review',
   'No test suite. Calculators, AWG tables, LVD copy, efficiency math, and reviewBatteryModel() have zero unit tests; verification is build + lint + screenshot. For tools that recommend wire gauge and cutoff voltages, that is not a test strategy. Add tests for the four calculator formulas, the AWG table, reviewBatteryModel flags, and the load→battery→panel efficiency contract, and run them in CI. Playwright/e2e can come later.',
   'planned', 0, false, 67),

  (0, 'infrastructure', 'HTTP security headers',
   'next.config.ts sets no CSP, HSTS, X-Frame-Options, Referrer-Policy, or Permissions-Policy. Cookie flags are whatever @supabase/ssr defaults to. Minimum before public: CSP (start strict, loosen for Supabase/auth), HSTS on the real domain, frame-ancestors none. XSS on a future comment feature becomes session theft without this.',
   'planned', 0, false, 68),

  (0, 'infrastructure', 'error.tsx, not-found.tsx, and calculator NaN guards',
   'No app-level error.tsx or not-found.tsx — failed server actions throw, failed label scans alert(). Panel calculator surplus % divides by dailyKwh and goes NaN at 0. Add the Next.js error boundaries and guard calculator inputs (hours 0–24, watts ≥ 0, dailyKwh > 0 before dividing).',
   'planned', 0, false, 69),

  (0, 'calculators', 'Battery scraper: re-scrape scheduling + published-row review gate',
   'Production gate before any battery_models row is published (the public battery calculator already lists them). The upsert currently overwrites an already-published row''s data on every re-run with no re-review step — a scheduled job silently changing a live price/spec would break the "scraped data isn''t trusted until reviewed" rule. Fix overwrite-protection first. Then, later, add a scheduled re-scrape (GitHub Actions, weekly/monthly — battery specs don''t change daily) for the known brands. Scrapers are manual-only today.',
   'planned', 0, false, 70),

  -- Phase 1 — content completeness (onboarding differentiator)
  (1, 'onboarding', 'Guided beginner onboarding',
   'Plain-English explainers woven into guides and calculators, not a separate wizard. Differentiator #1.',
   'planned', 0, true, 60),

  (1, 'onboarding', 'Remaining guide pages',
   'wiring, depth-of-discharge, grounding, inverter-settings, glossary. how-it-works and battery-types have shipped. Do not re-link from the index or footer until each page exists (see "Fix /guides index dead links").',
   'planned', 0, true, 62),

  (1, 'onboarding', 'Guides: expertise-level profile field + filtering',
   'Add a skill_level column to profiles (beginner/intermediate/advanced), a place in account settings to set it, and use it to filter or reorder the /guides index — the "beginner" tags already exist on every guide card, this just closes the loop so a returning user sees their level first. Needs its own migration + RLS policy, same pattern as the existing role column.',
   'planned', 0, true, 63),

  (1, 'infrastructure', 'Full accessibility audit',
   'Manual screen reader pass (VoiceOver/NVDA) across every page, a systematic color-contrast check, and testing with real assistive-technology users. Known gaps the audit must cover: high-contrast mode only restyles body/links/buttons so yellow calculator result cards stay yellow; prefers-reduced-motion is ignored at the OS level unless the widget is opened; how-it-works SVG + foreignObject diagrams are largely invisible to screen readers; a11y dialog and Pro modal have no focus trap. Do not claim WCAG 2.1 AA beyond "aiming at" until this is done — the /accessibility page is already a self-assessment, keep it that way.',
   'planned', 0, true, 82),

  (1, 'onboarding', 'Ask installation environment up front (cabin/house/boat/camper/unheated shed)',
   'A single early question — where is this system going? — unlocks environment-specific risk warnings we currently bury in guide prose and hope people read: cold-charge damage on LiFePO4 in an unheated shed, corrosion/vibration concerns on a boat, weight limits on a camper. Surface the relevant warnings inline wherever the answer is known, instead of listing every risk on every guide regardless of relevance.',
   'planned', 0, true, 91),

  (1, 'calculators', 'Calculators: inverter / motor-surge sizing step',
   'Motor surge is explained in a sidebar on the load calculator and never enters a number. There is no inverter sizing step in the load → battery → panels flow, so the most common "why did my inverter shut down" failure is untaught. Add a peak/surge view (fridges, pumps, A/C compressors at 2–3× running watts) and a recommended inverter VA, with the same "estimate, not a spec" framing as the other calculators. After the phase-0 calculator correctness items, not before.',
   'planned', 0, true, 93),

  (1, 'calculators', 'Battery listings: series/parallel, not just "you need N"',
   'Published models show `You need ${ceil(totalKwh / capacity_kwh)}`. That is a kWh count, not a wiring plan: 2S2P vs 4P, current sharing, and that mixing 12.8V packs to make 24V is a different problem. If we show prices this becomes shopping advice. Teach the topology, or stop implying N identical units in parallel is the answer.',
   'planned', 0, true, 94),

  (1, 'infrastructure', 'Docs hygiene: CLAUDE.md, TECH-STACK, .env.example',
   'Internal. CLAUDE.md still lists /admin as unbuilt and the architecture tree is stale. TECH-STACK.md still says Vercel + Prisma. .env.example still says "set these in Vercel" and first claims the service-role key is unused, then describes the scrapers using it. The next session will follow the stale files. Not user-facing; do it when touching those files, not as its own heroic rewrite.',
   'planned', 0, false, 95),

  -- Phase 2 — account & ops foundation
  (2, 'infrastructure', 'User dashboard shell',
   '/dashboard ("My Projects") does not exist yet. Needed before Live Monitoring can be un-disabled on the homepage. Also the fix for calculator inputs only being saved to the browser''s localStorage today — not tied to the logged-in account at all, so two accounts in the same browser see the same data, and the same account in two different browsers sees none of it. If the standalone GDPR account-deletion item has not shipped by then, deletion of project data lives here too.',
   'planned', 0, true, 72),

  (2, 'admin', 'Admin portal: SEO, memberships, payments',
   'The remaining /admin sidebar sections beyond the roadmap board and battery review — currently "Soon" stubs in src/app/admin/layout.tsx.',
   'planned', 0, false, 74),

  (2, 'admin', 'Admin: battery model review (approve/reject scraped rows)',
   'src/app/admin/batteries — lists battery_models rows pending review with automated sanity checks (capacity_kwh vs voltage x Ah, price/kWh and DoD range checks for the stated chemistry, multi-unit bundle detection from the model name, source-domain plausibility, near-duplicate grouping) shown as pass/warn/fail per row, plus approve/reject/unpublish actions. The checks catch scraper mistakes, not physics correctness — a human still opens source_url and spot-checks before approving. Same logic is meant to seed "Battery scraper: agent-assisted review" later.',
   'in_test', 90, false, 75),

  (2, 'calculators', 'battery_models: track charge-temperature range and self-heating so vendor listings can flag cold-climate risk',
   'The battery calculator lists real vendor models (brand/model/capacity/price) but nothing about charge-temperature range or self-heating. Add those columns, have the scraper capture them where the source datasheet states it, and show an explicit "cold-charge protection: confirmed / not stated" badge per model instead of leaving users to go find the datasheet themselves. Sequence after the in-flight Epoch/SOK/Enjoybot scraper branch merges, not concurrently with it.',
   'planned', 0, true, 92),

  (2, 'calculators', 'Battery spec data pipeline (scraper)',
   'battery_models table + scripts/scrape-*.ts. Collects real battery model specs (brand, capacity, voltage, DoD) from manufacturer sites so the battery calculator can eventually recommend "4x EG4 LL-S 100Ah" instead of just a kWh number. Rows land unpublished; an admin review step (part of the admin scrapers item) gates anything reaching a visitor. Started with EG4 only — robots.txt ruled out Renogy (explicitly disallows AI crawlers); SOK and Battle Born are next.',
   'in_development', 20, false, 76),

  (2, 'admin', 'Admin: 2FA and an audit log for role changes',
   'First admin is promoted by hand in the SQL editor. No 2FA, no audit log of who published a battery row or who flipped a profiles.role. Fine while it is one operator; not fine once anyone else has the admin role or the board is reachable on a public domain. Pair with the existing admin portal item.',
   'planned', 0, false, 78),

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
