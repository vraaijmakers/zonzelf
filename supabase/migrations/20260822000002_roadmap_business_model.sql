-- 2026-08-22 business-model / legal-posture session. Vincent questioned whether
-- ZonZelf can monetize enough to justify the liability the phase-0 board is
-- full of. Three decisions came out of it, and this migration records them on
-- the board:
--
--   1. Jurisdiction: US LLC, US-first audience. NEC 310.16 is the governing
--      code (the AWG item already said so). The EU Product Liability
--      Directive (2024/2853, software-as-product, strict liability) is now
--      largely out of scope for the entity; GDPR still applies to EU visitors.
--
--   2. The liability fault line runs through the calculators, not the guides.
--      Winter v. G.P. Putnam's Sons, 938 F.2d 1033 (9th Cir. 1991) held the
--      informational content of a book is not a "product" and publishers owe
--      no general duty to verify accuracy — guides sit there. But Winter
--      distinguished rather than overruled Saloomey v. Jeppesen and Brocklesby,
--      where aeronautical charts WERE products, because a chart mechanically
--      translates data into an output acted on directly in a hazardous
--      activity. A calculator emitting "Recommended gauge: AWG 10" is much
--      closer to the chart than to the book. So demoting prescriptive copy is
--      permanent product design, not a holding pattern until sign-off.
--
--   3. Monetization inverts. Solar Assistant charges $59 once + $30/yr; a
--      $5-9/mo subscription is 2-4x the incumbent from a less-trusted
--      newcomer. Affiliate (5-6%) plus content is the realistic majority of
--      revenue and sits on the Winter-protected publisher side. Monitoring
--      stays free — it is what creates daily active users, which is the
--      reason CLAUDE.md wanted it in the first place. Differentiator #2
--      ("no proprietary hardware") also actively destroys the subscription's
--      collectability: an open MODBUS agent is forkable in an afternoon.
--
-- Keep in sync with supabase/seed.sql. Verify with `npm run dump:roadmap`
-- before and after applying — see that script's header for why a db reset
-- cannot verify this.

-- ---------------------------------------------------------------------------
-- Reframe: prescriptive output is a permanent design rule
-- ---------------------------------------------------------------------------

update public.roadmap_items
  set title = 'Calculators: show the derivation, never a bare recommendation',
      description = 'Permanent design principle, not a temporary measure pending sign-off. US product-liability law splits on whether information is a "product": Winter v. G.P. Putnam''s Sons (9th Cir. 1991) held a book''s informational content is not, and that publishers owe no general duty to verify accuracy — that is where the guides sit. Saloomey v. Jeppesen and Brocklesby held aeronautical charts ARE products, because a chart mechanically converts data into an output the user acts on directly in a hazardous activity. "Recommended gauge: AWG 10" in large green type is the chart, not the book. Every calculator must show the code table, show the arithmetic, cite the source, and teach the user to derive the answer — never emit a bare authoritative number. This is differentiator #1 (plain English is the product) executed properly; the liability fix and the product goal are the same move. Pairs with the disclaimer and the electrician sign-off, replaces neither.'
  where title = 'Calculators: demote "Recommended" copy until engineer-reviewed';

-- ---------------------------------------------------------------------------
-- Legal posture: record the US LLC decision
-- ---------------------------------------------------------------------------

update public.roadmap_items
  set description = 'Decided 2026-08-22: US LLC, US-first audience, NEC 310.16 as the governing electrical code. Remaining work is execution, not the decision — file the LLC and name it plus the governing law in the Terms "Governing law" section, which is still a visible [TODO] in src/app/terms/page.tsx. Operating as a natural person means unlimited personal liability; this is a hard gate before collecting an email or a dollar.'
  where title = 'Legal: confirm entity and jurisdiction';

update public.roadmap_items
  set description = 'Production gate. US counsel reviews the disclaimer, terms, and privacy pages against the US LLC and NEC framing: liability language measured against the confidence of calculator output (see "Calculators: show the derivation"), clickwrap assent, affiliate disclosure, and the FTC endorsement rules. GDPR/AVG still applies to EU visitors even with a US entity — lawful basis, processor list (Supabase, plus Anthropic vision for /api/scan-label), retention, US transfers, and a DSR channel all still need answering, but as a visitor-facing obligation rather than the entity-level exposure the EU Product Liability Directive would have been. Visible [TODO] placeholders must be gone before zonzelf.com is public.'
  where title = 'Legal: professional review before production';

-- ---------------------------------------------------------------------------
-- New phase-0 gates
-- ---------------------------------------------------------------------------

insert into public.roadmap_items
  (phase, category, title, description, status, dev_percent_complete, is_public, display_order)
values
  (0, 'infrastructure', 'Form the US LLC + liability insurance',
   'Hard gate before collecting any email or any money. File the LLC (~$150-800 first year incl. registered agent, ~$100-300/yr after) and bind cover before launch: media liability averages ~$930/yr for a publisher, tech E&O runs $500-3,000/yr. Stage the spend against revenue milestones rather than paying it all upfront. Until this exists, ZonZelf is Vincent personally, with unlimited personal liability, publishing electrical guidance.',
   'planned', 0, false, 71),

  (0, 'infrastructure', 'Clickwrap assent for terms and disclaimer',
   'The disclaimer is currently a footer link. Courts treat browsewrap as weak evidence of assent — a disclaimer nobody affirmatively accepted is much harder to rely on, and US courts have struck down all-encompassing waivers as overbroad. Add an explicit "I have read and accept" checkbox at signup (and before any paid tier), storing the timestamp and the version of the terms accepted. This is what makes the disclaimer worth having; it does not replace fixing the calculators.',
   'planned', 0, false, 72);

-- ---------------------------------------------------------------------------
-- Phase 1: affiliate is now primary revenue, so disclosure is on the board
-- ---------------------------------------------------------------------------

insert into public.roadmap_items
  (phase, category, title, description, status, dev_percent_complete, is_public, display_order)
values
  (1, 'onboarding', 'Affiliate disclosure + FTC-compliant link policy',
   'Affiliate is now the primary revenue line, and the FTC requires disclosure that is clear and conspicuous — near the link, before the click, not buried in a footer or a separate page. Needs a standing disclosure component on any page carrying affiliate links, a policy page explaining what is and is not paid placement, and a rule that a component is never recommended because it pays better. On a site whose entire moat is beginner trust, an undisclosed affiliate link costs more than it earns.',
   'planned', 0, true, 96);

-- ---------------------------------------------------------------------------
-- Monitoring: retention feature, not the revenue engine
-- ---------------------------------------------------------------------------

update public.roadmap_items
  set description = 'Brand-agnostic MODBUS/serial agent (Python, runs on a Pi/PC) posting to /api/ingest. Differentiator #2. Deliberately free: the agent is open and forkable by design, so it cannot carry a subscription — Solar Assistant''s $149 dongle is precisely the lock-in ZonZelf is choosing not to have. Its value is the daily active users it creates, which is what makes affiliate and content revenue work.'
  where title = 'Local monitoring agent';

update public.roadmap_items
  set description = 'The user-facing live monitoring screen and the ingest endpoint the local agent posts to. Depends on the dashboard shell. Free feature — see "Local monitoring agent". Paid tiers are deferred until there is evidence users will pay, and are not assumed by the plan.'
  where title = 'Monitoring dashboard UI + /api/ingest';

-- ---------------------------------------------------------------------------
-- Typo in an operator-created row, recovered from the live DB on 2026-08-22
-- ---------------------------------------------------------------------------

update public.roadmap_items
  set description = 'Make sure all components and services conform to the latest security standards.'
  where title = 'Run a full security scan';
