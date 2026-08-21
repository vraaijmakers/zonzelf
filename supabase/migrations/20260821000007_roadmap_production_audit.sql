-- 2026-08-21 implementation audit. Adds the production-gate findings and
-- re-prioritizes a few existing items that were filed later than they
-- should be. Does not duplicate work already on the board (dead links,
-- legal contact/entity/lawyer review, remaining guides, a11y audit,
-- charge-loop check, scraper published-row overwrite) — those get an
-- UPDATE of description and/or phase/display_order instead.
--
-- Keep in sync with supabase/seed.sql, which encodes this same end state
-- directly for a fresh local `supabase db reset`.

-- ---------------------------------------------------------------------------
-- Re-prioritize existing items
-- ---------------------------------------------------------------------------

-- Footer and the battery guide still link to pages that 404. The 2026-08-20
-- cleanup only covered /resources and /dashboard.
update public.roadmap_items
  set description = 'Guides index still cards 5 pages that do not exist (depth-of-discharge, wiring, grounding, inverter-settings, glossary). Footer links wiring/grounding/glossary. Battery guide links /guides/depth-of-discharge twice. how-it-works has since shipped — leave that card. Production gate: do not index or footer-link a guide until its page exists. Writing the missing guides is the separate "Remaining guide pages" item.',
      display_order = 59
  where title = 'Fix /guides index dead links';

update public.roadmap_items
  set display_order = 60
  where title = 'Legal: real contact channel';

update public.roadmap_items
  set display_order = 61
  where title = 'Legal: confirm entity and jurisdiction';

update public.roadmap_items
  set description = 'Disclaimer/terms/privacy/accessibility are a first draft, not lawyer-reviewed, and currently show [TODO] placeholders to visitors. Before production, counsel must review: governing law and legal entity, liability language vs the confidence of calculator "Recommended" copy, GDPR/AVG (lawful basis, processor list including Supabase + Anthropic vision for /api/scan-label, retention, US transfers, cookie assessment, DSR channel), and consumer-law risk of advertising Pro/subscriptions/monitoring that do not exist yet. Visible TODOs must be gone before zonzelf.com is public.',
      display_order = 62
  where title = 'Legal: professional review before production';

update public.roadmap_items
  set description = 'wiring, depth-of-discharge, grounding, inverter-settings, glossary. how-it-works and battery-types have shipped. Do not re-link from the index or footer until each page exists (see "Fix /guides index dead links").',
      display_order = 62
  where title = 'Remaining guide pages';

update public.roadmap_items
  set description = 'Manual screen reader pass (VoiceOver/NVDA) across every page, a systematic color-contrast check, and testing with real assistive-technology users. Known gaps the audit must cover: high-contrast mode only restyles body/links/buttons so yellow calculator result cards stay yellow; prefers-reduced-motion is ignored at the OS level unless the widget is opened; how-it-works SVG + foreignObject diagrams are largely invisible to screen readers; a11y dialog and Pro modal have no focus trap. Do not claim WCAG 2.1 AA beyond "aiming at" until this is done — the /accessibility page is already a self-assessment, keep it that way.',
      display_order = 82
  where title = 'Full accessibility audit';

-- Shipping calculators that do not close the energy loop teaches false
-- completeness. This was filed as phase 2; it is a production-gate item
-- for the calculator suite.
update public.roadmap_items
  set phase = 0,
      display_order = 58,
      description = 'Production gate for the calculator suite. The battery and panel calculators size storage (kWh) and generation (kWh/day) independently, but never check whether the array can actually refill the bank within the site''s peak sun hours. A user can size a "correct" battery bank and a "correct" array and still end up under-charging every day. Add a check on the battery calculator (or a shared summary) comparing array output over peak sun hours against the daily kWh drawn from the battery, and warn when the recharge doesn''t close the loop. Surfaced in the how-it-works guide; originally filed as phase 2 and pulled forward by the 2026-08-21 audit.'
  where title = 'Battery calculator: flag when the panel array can''t recharge the bank in the available sun';

-- The battery calculator already renders published rows to visitors. A
-- re-scrape that clobbers those rows is a production bug the moment any
-- row is approved — not a phase-2 ops nicety.
update public.roadmap_items
  set phase = 0,
      display_order = 70,
      description = 'Production gate before any battery_models row is published (the public battery calculator already lists them). The upsert currently overwrites an already-published row''s data on every re-run with no re-review step — a scheduled job silently changing a live price/spec would break the "scraped data isn''t trusted until reviewed" rule. Fix overwrite-protection first. Then, later, add a scheduled re-scrape (GitHub Actions, weekly/monthly — battery specs don''t change daily) for the known brands. Scrapers are manual-only today.'
  where title = 'Battery scraper: re-scrape scheduling + published-row review gate';

update public.roadmap_items
  set description = 'Wire --zon-* tokens into globals.css and shadcn primitives; circular --font-sans is fixed. Remaining debt: calculators, battery guide, admin, and legal pages still use raw yellow-* / gray-* utilities (~90 yellow and ~130 gray class usages). New views must use tokens; converting the leftover pages is this item, not a side effect of the next feature.'
  where title = 'Design token pass';

update public.roadmap_items
  set description = '/dashboard ("My Projects") does not exist yet. Needed before Live Monitoring can be un-disabled on the homepage. Also the fix for calculator inputs only being saved to the browser''s localStorage today — not tied to the logged-in account at all, so two accounts in the same browser see the same data, and the same account in two different browsers sees none of it. If the standalone GDPR account-deletion item has not shipped by then, deletion of project data lives here too.'
  where title = 'User dashboard shell';

-- ---------------------------------------------------------------------------
-- New production-gate items (phase 0)
-- ---------------------------------------------------------------------------

insert into public.roadmap_items
  (phase, category, title, description, status, dev_percent_complete, is_public, display_order)
values
  -- Educational safety — these numbers can cause people to buy the wrong
  -- cable or flatten a battery. Public, because the product *is* the teaching.
  (0, 'calculators', 'Calculators: correct inverter cutoff voltages',
   'The battery calculator currently tells a 12V LiFePO4 user to set LVD at 12.0V for 80% DoD — that is near empty on a 4S 12.8V pack; 80% DoD is roughly 12.8–13.0V rest. Lead-acid 50% DoD at 11.8V is also low (rest is closer to 12.1–12.2V). Cite manufacturer / chemistry tables, distinguish rest vs loaded voltage, and stop inventing a single "typical" number that contradicts the DoD the rest of the page teaches. Highest-severity educational bug from the 2026-08-21 audit.',
   'planned', 0, true, 51),

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

  -- Security / platform — not public. Do not advertise holes on the board.
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

  -- -------------------------------------------------------------------------
  -- Phase 1 — content completeness, after the production gate
  -- -------------------------------------------------------------------------
  (1, 'calculators', 'Calculators: inverter / motor-surge sizing step',
   'Motor surge is explained in a sidebar on the load calculator and never enters a number. There is no inverter sizing step in the load → battery → panels flow, so the most common "why did my inverter shut down" failure is untaught. Add a peak/surge view (fridges, pumps, A/C compressors at 2–3× running watts) and a recommended inverter VA, with the same "estimate, not a spec" framing as the other calculators. After the phase-0 calculator correctness items, not before.',
   'planned', 0, true, 93),

  (1, 'calculators', 'Battery listings: series/parallel, not just "you need N"',
   'Published models show `You need ${ceil(totalKwh / capacity_kwh)}`. That is a kWh count, not a wiring plan: 2S2P vs 4P, current sharing, and that mixing 12.8V packs to make 24V is a different problem. If we show prices this becomes shopping advice. Teach the topology, or stop implying N identical units in parallel is the answer.',
   'planned', 0, true, 94),

  (1, 'infrastructure', 'Docs hygiene: CLAUDE.md, TECH-STACK, .env.example',
   'Internal. CLAUDE.md still lists /admin as unbuilt and the architecture tree is stale. TECH-STACK.md still says Vercel + Prisma. .env.example still says "set these in Vercel" and first claims the service-role key is unused, then describes the scrapers using it. The next session will follow the stale files. Not user-facing; do it when touching those files, not as its own heroic rewrite.',
   'planned', 0, false, 95),

  -- -------------------------------------------------------------------------
  -- Phase 2 — ops, after accounts mean something
  -- -------------------------------------------------------------------------
  (2, 'admin', 'Admin: 2FA and an audit log for role changes',
   'First admin is promoted by hand in the SQL editor. No 2FA, no audit log of who published a battery row or who flipped a profiles.role. Fine while it is one operator; not fine once anyone else has the admin role or the board is reachable on a public domain. Pair with the existing admin portal item.',
   'planned', 0, false, 78);
