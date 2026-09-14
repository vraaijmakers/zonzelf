-- Two ideas surfaced while building the "How a Solar System Works" beginner
-- guide (2026-08-21). Both are deliberately deferred rather than built inline:
-- the profile field needs a migration + RLS + a settings UI, and the charge
-- rate check changes the battery calculator's actual math — neither is a
-- content-page change, so each gets scoped and built in its own session.

insert into public.roadmap_items
  (phase, category, title, description, status, dev_percent_complete, is_public, display_order)
values
  (1, 'onboarding', 'Guides: expertise-level profile field + filtering',
   'Add a skill_level column to profiles (beginner/intermediate/advanced), a place in account settings to set it, and use it to filter or reorder the /guides index — the "beginner" tags already exist on every guide card, this just closes the loop so a returning user sees their level first. Needs its own migration + RLS policy, same pattern as the existing role column.',
   'planned', 0, true, 63),

  (2, 'calculators', 'Battery calculator: flag when the panel array can''t recharge the bank in the available sun',
   'The battery and panel calculators size storage (kWh) and generation (kWh/day) independently, but never check whether the charge current the array can actually deliver is enough to refill the battery bank within the site''s peak sun hours. A user can size a "correct" battery bank and a "correct" array and still end up under-charging every day. Add a check on the battery calculator (or a shared summary) comparing array output over peak sun hours against the daily kWh drawn from the battery, and warn when the recharge doesn''t close the loop.',
   'planned', 0, true, 90);
