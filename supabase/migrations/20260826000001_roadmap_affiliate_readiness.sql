-- Affiliate is the primary revenue line (see CLAUDE.md, Monetization), but the
-- battery catalogue cannot currently carry it. Found by working through a real
-- worked example rather than by planning.
--
-- Keep in sync with supabase/seed.sql (CI enforces this).

insert into public.roadmap_items
  (phase, category, title, description, status, dev_percent_complete, is_public, display_order)
values
  (1, 'calculators', 'Battery catalogue: price coverage and vendor mix for affiliate',
   'Affiliate is the primary revenue line, and the catalogue cannot currently carry it. Of 20 published battery models, only 7 have a price: all 7 are SunGoldPower. EG4 has 3 models with no price, and Victron has 10 with none. A product without a price cannot be monetised and is also less useful to the reader, since the calculator can show "you need 9" but not what that costs. Two jobs. First, capture prices for EG4 — Signature Solar carries EG4 and pays up to 9%, the highest rate available to us, so those three rows are the single biggest unlock in the catalogue. Second, widen the vendor mix deliberately toward brands whose retailers actually run affiliate programmes: Signature Solar (up to 9%, 7-day cookie), SunGoldPower (6%, roughly $1,000 average order, via ShareASale or Awin), Renogy (~6%), A1 Solar Store (6%), Bluetti (5-10%). Victron is worth keeping for coverage and comparison but sells through a dealer network with no direct affiliate programme found, so it should be understood as editorial rather than revenue. Note the constraint that shapes all of this: cookie windows are short — Signature Solar is 7 days — while DIY solar research runs for months, so the revenue comes from readers already close to buying. Depends on the scraper items for extraction, and pairs with the FTC affiliate-disclosure item, which must land before any link goes live.',
   'planned', 0, false, 97);
