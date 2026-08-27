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
--
-- THIS FILE IS NOT A BACKUP. It is a hand-maintained reconstruction, and on
-- 2026-08-22 it was found to have silently drifted from the live board in
-- four places: one item created through /admin/roadmap ("Run a full security
-- scan") existed here not at all, and three display_order values had never
-- matched. Nothing detects that drift on its own — the admin Server Actions
-- write straight to the database, and a `db reset` only ever proves this file
-- agrees with the migrations, never that either agrees with reality.
--
-- Before editing the board, and again after, run:
--
--     npm run dump:roadmap
--
-- and diff it against this file. See scripts/dump-roadmap.ts.

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
   'Fixed: the table now carries NEC 310.16 copper ampacities with a selectable 60/75/90 °C terminal column (defaulting to 75 °C per NEC 110.14(C), since the lowest-rated termination limits the circuit), and applies the NEC 240.4(D) small-conductor caps that override it — so 10 AWG reads 30 A, not the 55 A chassis rating it showed before. Sizes thinner than 14 AWG are gone; Table 310.16 does not cover them. Values cross-checked against two independent reproductions of the table and covered by unit tests in src/lib/__tests__/awg.test.ts. The page cites its sources and states what is NOT modelled: free-air ampacity (310.17, only one source could be verified), ambient derates above 30 °C, and conduit-fill adjustment — all of which REDUCE ampacity. Still blocked on the separate licensed-electrician sign-off before this counts as reviewed, and overcurrent protection is called out on the page but not yet calculated (see the fuse/breaker item).',
   'in_test', 90, true, 52),

  (0, 'calculators', 'Calculators: appliance presets use duty cycle, not nameplate × 24h',
   'Fixed for refrigeration: appliance rows now carry a duty cycle — the fraction of their in-service hours they actually draw power — and the presets apply it. The full-size fridge falls from 150 W × 24 h = 3.6 kWh/day to about 1.3 kWh/day, and the mini fridge from 1.92 to about 0.58, both inside the 1–2 kWh/day band two independent sources give for a modern unit in a temperate kitchen (compressor running 33–40% of the time). A chest freezer preset was added on the same basis. Watts stays the RUNNING figure so inverter sizing can still use it; duty % is what turns it into energy. Air-conditioning presets are deliberately left at 100% and flagged as cycling: no two-source duty figure was established for them, and inventing one would repeat this bug — the overestimate oversizes rather than undersizes. Rows saved before this shipped have no duty value and are treated as 100%, so no one''s stored numbers change underneath them. Covered by src/lib/__tests__/appliance-load.test.ts.',
   'in_test', 90, true, 53),

  (0, 'calculators', 'Calculators: one efficiency model across load / battery / panels',
   'Fixed. src/lib/system-efficiency.ts is now the single definition, and all three pages read from it instead of doing their own arithmetic. The physical chain has three distinct losses, not one: inverter and wiring (DC to AC, 85% default), battery round trip (per chemistry — the field the battery calculator defined and never applied: lithium 97%, AGM/gel 85%, flooded 80%), and array derate (soiling, heat, MPPT, cabling, 80%). A battery bank pays only the inverter, because it is sized by what it hands to the load; an array pays all three, because the energy it generates is stored before it is used. That correction matters: the old panel maths omitted battery round trip entirely and so UNDERSIZED the array — about 3% for lithium, about 25% for flooded lead-acid. The battery calculator publishes its chemistry so the panel page uses the real figure rather than a default. Copy was corrected to match: the load calculator no longer tells users to carry one number into both battery AND panel sizing, the panel page no longer calls its array derate "system efficiency" or claims it includes inverter losses, and the panel page no longer inherits the load calculator''s efficiency as its own. Locked by src/lib/__tests__/system-efficiency.test.ts, which CI now runs — a contract test that CI does not execute is not a contract. Still blocked on the licensed-electrician sign-off before any of this counts as reviewed.',
   'in_test', 90, true, 54),

  (0, 'calculators', 'Calculators: peak sun hours are annual averages — say so',
   'The regional presets (Netherlands 2.5h, etc.) are annual figures. December in NL is closer to 1h. No worst-month, no tilt, no shading. Fine as a first estimate if the page says so; currently it does not. Label them annual, and offer a worst-month input so a beginner does not size an array that only works in June.',
   'planned', 0, true, 55),

  (0, 'calculators', 'Calculators: show the derivation, never a bare recommendation',
   'Permanent design principle, not a temporary measure pending sign-off. US product-liability law splits on whether information is a "product": Winter v. G.P. Putnam''s Sons (9th Cir. 1991) held a book''s informational content is not, and that publishers owe no general duty to verify accuracy. Saloomey v. Jeppesen and Brocklesby held aeronautical charts ARE products, because a chart mechanically converts data into an output the user acts on directly in a hazardous activity. "Recommended gauge: AWG 10" in large green type is the chart, not the book. SCOPE: this applies to the protection register (conductor gauge, overcurrent protection, cutoff voltage, voltage windows) — see "Calculators: split output into capacity and protection registers". Capacity outputs stay confident and specific; they are the product. For protection outputs: show the code table, show the arithmetic so it can be checked, cite the source, let the user pick the installation context, and return the set of options that pass rather than a single verdict. Pairs with the disclaimer and the electrician sign-off, replaces neither — and note that showing the derivation of a WRONG number documents the error rather than excusing it, so the correctness items are prerequisites, not alternatives.',
   'planned', 0, true, 56),

  (0, 'calculators', 'Calculators: licensed electrician/engineer sign-off',
   'Production gate. A licensed electrician or solar engineer reviews the four calculators (formulas, AWG source table, LVD table, fridge/AC presets, efficiency model) against NEC/NEN 1010/IEC 60364 and manufacturer chemistry data. This is domain review, not the lawyer review of the legal pages. Do not put zonzelf.com in public DNS as an educational product until this has happened.',
   'planned', 0, true, 57),

  (0, 'calculators', 'Battery calculator: flag when the panel array can''t recharge the bank in the available sun',
   'Production gate, and the first cross-stage check in the sizing chain. The battery and panel calculators size storage (kWh) and generation (kWh/day) independently and never check whether the array can refill the bank within the site''s peak sun hours — so a user can size a "correct" bank and a "correct" array and still under-charge every day. Add a check comparing array output over peak sun hours against the daily kWh drawn from the battery, and warn when the recharge does not close the loop. This is the pattern every later cross-stage check follows; the phase-1 system designer generalises it rather than replacing it. Surfaced in the how-it-works guide; pulled forward from phase 2 by the 2026-08-21 audit.',
   'planned', 0, true, 58),

  (0, 'onboarding', 'Fix /guides index dead links',
   'Guides index still cards 5 pages that do not exist (depth-of-discharge, wiring, grounding, inverter-settings, glossary). Footer links wiring/grounding/glossary. Battery guide links /guides/depth-of-discharge twice. how-it-works has since shipped — leave that card. Production gate: do not index or footer-link a guide until its page exists. Writing the missing guides is the separate "Remaining guide pages" item.',
   'planned', 0, true, 59),

  (0, 'infrastructure', 'Legal: real contact channel',
   'Disclaimer/terms/privacy/accessibility pages currently have a [TODO] instead of contact info — publishing "reach out via GitHub" is not usable for a non-technical visitor. Blocked on Vincent choosing a channel (email vs. contact form).',
   'planned', 0, false, 60),

  (0, 'infrastructure', 'Legal: confirm entity and jurisdiction',
   'Decided 2026-08-22: US LLC, US-first audience, NEC 310.16 as the governing electrical code. Remaining work is execution, not the decision — file the LLC and name it plus the governing law in the Terms "Governing law" section, which is still a visible [TODO] in src/app/terms/page.tsx. Operating as a natural person means unlimited personal liability; this is a hard gate before collecting an email or a dollar.',
   'planned', 0, false, 61),

  (0, 'infrastructure', 'Legal: professional review before production',
   'Production gate. US counsel reviews the disclaimer, terms, and privacy pages against the US LLC and NEC framing: liability language measured against the confidence of calculator output (see "Calculators: show the derivation"), clickwrap assent, affiliate disclosure, and the FTC endorsement rules. GDPR/AVG still applies to EU visitors even with a US entity — lawful basis, processor list (Supabase, plus Anthropic vision for /api/scan-label), retention, US transfers, and a DSR channel all still need answering, but as a visitor-facing obligation rather than the entity-level exposure the EU Product Liability Directive would have been. Visible [TODO] placeholders must be gone before zonzelf.com is public.',
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
   'npm test runs in CI on every PR. 80 tests across five modules. The newest lock the overcurrent contract: a device never exceeds what the conductor can carry, never falls below 125% of a continuous load, a PV string needs a 20 A device where a naive 15 A would be chosen, an unprotectable conductor is reported rather than papered over, every returned rating is a real purchasable NEC 240.6(A) size, and — the cross-module contract — anything the AWG calculator presents as passing can actually be protected. Still uncovered: the panel count and peak-sun maths, reviewBatteryModel() flags, and anything at the page level.',
   'in_test', 85, false, 67),

  (0, 'infrastructure', 'HTTP security headers',
   'next.config.ts sets no CSP, HSTS, X-Frame-Options, Referrer-Policy, or Permissions-Policy. Cookie flags are whatever @supabase/ssr defaults to. Minimum before public: CSP (start strict, loosen for Supabase/auth), HSTS on the real domain, frame-ancestors none. XSS on a future comment feature becomes session theft without this.',
   'planned', 0, false, 68),

  (0, 'infrastructure', 'error.tsx, not-found.tsx, and calculator NaN guards',
   'No app-level error.tsx or not-found.tsx — failed server actions throw, failed label scans alert(). Panel calculator surplus % divides by dailyKwh and goes NaN at 0. Add the Next.js error boundaries and guard calculator inputs (hours 0–24, watts ≥ 0, dailyKwh > 0 before dividing).',
   'planned', 0, false, 69),

  (0, 'calculators', 'Battery scraper: re-scrape scheduling + published-row review gate',
   'Production gate before any battery_models row is published (the public battery calculator already lists them). The upsert currently overwrites an already-published row''s data on every re-run with no re-review step — a scheduled job silently changing a live price/spec would break the "scraped data isn''t trusted until reviewed" rule. Fix overwrite-protection first. Then, later, add a scheduled re-scrape (GitHub Actions, weekly/monthly — battery specs don''t change daily) for the known brands. Scrapers are manual-only today.',
   'planned', 0, false, 70),

  (0, 'infrastructure', 'Form the US LLC + liability insurance',
   'Hard gate before collecting any email or any money. File the LLC (~$150-800 first year incl. registered agent, ~$100-300/yr after) and bind cover before launch: media liability averages ~$930/yr for a publisher, tech E&O runs $500-3,000/yr. Stage the spend against revenue milestones rather than paying it all upfront. Until this exists, ZonZelf is Vincent personally, with unlimited personal liability, publishing electrical guidance.',
   'planned', 0, false, 71),

  (0, 'infrastructure', 'Clickwrap assent for terms and disclaimer',
   'The disclaimer is currently a footer link. Courts treat browsewrap as weak evidence of assent — a disclaimer nobody affirmatively accepted is much harder to rely on, and US courts have struck down all-encompassing waivers as overbroad. Add an explicit "I have read and accept" checkbox at signup (and before any paid tier), storing the timestamp and the version of the terms accepted. This is what makes the disclaimer worth having; it does not replace fixing the calculators.',
   'planned', 0, false, 72),

  (0, 'calculators', 'Calculators: split output into capacity and protection registers',
   'The design decision that makes the derivation rule tractable. Classify every calculator output as either CAPACITY (daily kWh, bank kWh, panel count, inverter continuous rating — wrong means an undersized system, not an injury) or PROTECTION (conductor gauge, fuse/breaker rating, battery cutoff voltage, string Voc vs MPPT window — wrong starts fires or destroys equipment). Capacity outputs keep their current confident treatment: they are the product, and they are also where the affiliate value sits. Protection outputs get the full derivation treatment and never appear as a bare number. Protection is roughly five outputs, so this is a small surface — the point of the exercise is to stop treating all four calculators as one undifferentiated liability problem.',
   'planned', 0, true, 73),

  (0, 'calculators', 'Calculators: capacity outputs are ranges, not point estimates',
   'Battery sizing shows three selectable scenarios — through the night, one sunless day, and the selected run of sunless days — rounded to a precision the inputs justify, each driving the real-battery counts. Load varies across them rather than being treated as constant. Each appliance carries a profile (all day / daytime / evening / cooling / heating) which separates two independent axes: WHEN a load runs, and HOW weather affects it. The first version conflated them and was cooling-biased — it suppressed "daytime" loads on overcast days, which is right for air conditioning and exactly backwards for heating, since heating runs hardest at night and harder still when it is cold and grey. That was a sign error, not an imprecision, and no page copy could rescue it. Cooling and heating now move the sunless-day load in opposite directions, each with its own adjustable factor rather than a baked-in constant. Because the risks are asymmetric — cooling load is anti-correlated with the shortage and so forgives an undersized bank, while heating is correlated and does not — a heating-dominated system now gets an explicit warning to size against the multi-day figure. The preset list also gained heating appliances; it previously had fourteen ways to cool a house and none to heat one, quietly assuming a warm climate. Remaining for this item: the load calculator total and the panel array size are still point estimates.',
   'in_development', 70, true, 74),

  (0, 'calculators', 'Calculators: fuse and breaker sizing — the fuse must protect the wire',
   'Fixed. src/lib/overcurrent.ts sizes the fuse or breaker between two bounds — at least 125% of a continuous load (NEC 210.20(A)), at most the conductor ampacity after the 240.4(D) small-conductor caps — and returns the standard NEC 240.6(A) ratings that fit, as a set rather than a verdict. A PV source circuit takes the 156% of NEC 690.8(A) instead: 125% for irradiance above nameplate, then 125% again for continuous duty. When no standard device fits, the page says the conductor is too small and names the thinner one that works, because the answer is thicker cable and never a bigger breaker. NEC 240.4(B) rounding up past ampacity is deliberately NOT applied — its conditions cannot be established from the inputs, so the conservative reading ships and the page says an electrician may go one size higher. A DC-rating warning is shown: an AC-only breaker will not break a DC fault, which is the most common dangerous substitution in DIY off-grid work. Adding this exposed a real defect in the AWG calculator, now also fixed: NEC 210.19(A)(1) requires the CONDUCTOR to be sized at 125% of a continuous load, not only its protection, and the calculator was checking bare ampacity. It presented 10 AWG as adequate for a 30 A continuous load, which no legal device can protect. Both bounds now derive from one shared factor, and a test asserts that anything the calculator presents can actually be protected. Not modelled: ambient derates above 30 °C, conduit fill, motor and transformer circuits, and interrupting rating.',
   'in_test', 90, true, 75),

  -- Phase 1 — content completeness (onboarding differentiator)
  (1, 'onboarding', 'Guided beginner onboarding',
   'Plain-English explainers woven into guides and calculators, not a separate wizard. Differentiator #1. Started 2026-08-25 after an audit of where each concept actually appears found the calculators had outrun the teaching badly: duty cycle, load profiles, the three-stage efficiency chain, the battery scenario band, dark hours and the cooling/heating asymmetry were all enforced by tools and explained on no page at all, and the glossary — whose entire job this is — defined none of the new vocabulary. A beginner met "Duty %", "Runs: Cooling" and "156% of Isc" with nowhere to look them up, which is differentiator #1 inverted. Done: the glossary gained ampacity, autonomy, continuous load, design current, duty cycle, Isc, OCPD and round-trip efficiency, cross-linked to the calculators and guides that use them; the wiring guide gained the 125% continuous rule and the 156% PV rule. Remaining: the efficiency chain belongs in /guides/how-it-works, and the autonomy-vs-overnight distinction plus the cooling/heating asymmetry belong with battery sizing. No test can tell you an explanation is clear, so this one is verified by a person reading it.',
   'in_development', 25, true, 70),

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

  (1, 'onboarding', 'Affiliate disclosure + FTC-compliant link policy',
   'Affiliate is now the primary revenue line, and the FTC requires disclosure that is clear and conspicuous — near the link, before the click, not buried in a footer or a separate page. Needs a standing disclosure component on any page carrying affiliate links, a policy page explaining what is and is not paid placement, and a rule that a component is never recommended because it pays better. On a site whose entire moat is beginner trust, an undisclosed affiliate link costs more than it earns.',
   'planned', 0, true, 96),

  -- Created by the operator through /admin/roadmap, recovered from the live
  -- database on 2026-08-22 — it had never existed in seed.sql or any migration.
  (1, 'infrastructure', 'Run a full security scan',
   'Make sure all components and services conform to the latest security standards.',
   'planned', 0, true, 100),

  (1, 'infrastructure', 'Docs hygiene: CLAUDE.md, TECH-STACK, .env.example',
   'Fixed. TECH-STACK.md listed Vercel hosting, Prisma and Playwright — none of which were ever set up — and a session followed it. It now states Next.js 16.3.1, no ORM, fetch + cheerio scraping, node:test via tsx, GitHub Actions, self-hosted Docker staging, and production explicitly NOT CONFIGURED, with a note that the table describes what exists rather than what was intended. .env.example no longer says to set values in Vercel, and no longer claims the service-role key is unused two lines before defining it for the scrapers. CLAUDE.md said staging was planned in one paragraph and described it deploying in the next; it now says staging is live and production is not chosen. The architecture tree and the /admin status were corrected earlier. Remaining: the CLAUDE.md file tree does not list the newer src/lib modules, which is cosmetic.',
   'in_test', 90, false, 95),

  (1, 'calculators', 'System designer: one integrated sizing chain',
   'The umbrella the four calculators become: one flow from appliances to a system, with assumptions stated once and carried visibly, uncertainty shown where it enters, and a stated confidence band on the result. Integration is not cosmetic — four tools that each look authoritative and quietly disagree is the worst configuration available, because it has the confidence of a specification and the coherence of a guess. Integration is what makes honesty structurally possible: it is the only place the chain can say "this number depends on that assumption you made three steps ago". Differentiator #1 at full strength. Depends on the phase-0 correctness items, which stay independent gates and must ship first — do NOT let this feature absorb them.',
   'planned', 0, true, 97),

  (1, 'calculators', 'Calculators: string voltage vs MPPT input window',
   'The panel calculator says how many panels to buy and nothing about how to wire them, so a beginner can series the whole array and exceed the charge controller''s maximum input voltage — a common and expensive way to destroy an MPPT before the system ever runs. Add a string check: panel Voc, count in series, and the cold-temperature Voc correction that catches people out (Voc RISES as temperature falls, so a string sized in July can be over the limit in January), checked against the controller''s max input. Protection-register output: show the derivation, cite the panel datasheet and controller spec, never a bare verdict. Phase 1 rather than phase 0 because it is a missing output rather than a wrong one — but it is the first phase-1 calculator item to pick up.',
   'planned', 0, true, 98),

  (1, 'calculators', 'Battery catalogue: price coverage and vendor mix for affiliate',
   'Affiliate is the primary revenue line, and the catalogue cannot currently carry it. All three EG4 models now have a price and a retailer, captured from Signature Solar (scripts/scrape-signaturesolar.ts, a hand-verified SKU-to-URL mapping — the storefront splits "Indoor" and "AllWeather" variants of the same capacity into separate products, so a naive title match would have picked the wrong one half the time). battery_models gained retailer and retailer_url columns rather than overwriting source_url, which stays the manufacturer spec citation. Vendor-mix widening has started: Bluetti turned out not to fit at all and was dropped from the plan, because its battery packs are ecosystem-locked to its own power stations rather than usable with any inverter (its own FAQ: the B300K "can only be charged by connecting to the AC500/AC300/AC200L/AC200MAX") — the same lock-in this project already refuses on the monitoring side. A1 SolarStore, a multi-brand reseller with its own affiliate program, added Discover Energy Systems as a new brand instead (scripts/scrape-a1solarstore.ts): a 5.12kWh 48V rack-mount model at $1,683.40. Discover Energy Systems sells through a dealer network with no storefront of its own, same as Victron — the row first cited A1 SolarStore''s product page for specs, which was caught as exactly the mistake source_url exists to prevent, so specs are now hardcoded from the manufacturer''s own datasheet (verified 51.2V, 100Ah, 5.12kWh, 100% usable DoD against A1 SolarStore''s numbers, which matched) and only price is scraped live from the retailer. All new and updated rows are unpublished pending admin review. Remaining: Victron stays editorial (no affiliate programme found); more of A1 SolarStore''s catalogue is worth a look (spotted but not yet verified: a Midnite Power 314Ah battery, and an EG4 "Indoor" 314Ah variant this catalogue is missing entirely) but its listings mix in bulk lead-acid pallets and bundled inverter+battery kits that do not belong here, so each addition needs the same manufacturer-datasheet verification as Discover Energy Systems. The FTC affiliate-disclosure item must still land before any of these links go live.',
   'in_development', 25, false, 97),

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
   'Brand-agnostic MODBUS/serial agent (Python, runs on a Pi/PC) posting to /api/ingest. Differentiator #2. Deliberately free: the agent is open and forkable by design, so it cannot carry a subscription — Solar Assistant''s $149 dongle is precisely the lock-in ZonZelf is choosing not to have. Its value is the daily active users it creates, which is what makes affiliate and content revenue work.',
   'planned', 0, true, 60),

  (3, 'monitoring', 'Monitoring dashboard UI + /api/ingest',
   'The user-facing live monitoring screen and the ingest endpoint the local agent posts to. Depends on the dashboard shell. Free feature — see "Local monitoring agent". Paid tiers are deferred until there is evidence users will pay, and are not assumed by the plan.',
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
   'planned', 0, true, 80);
