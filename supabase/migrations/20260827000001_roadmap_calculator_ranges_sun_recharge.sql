-- Load and panel capacity as bands; peak sun labelled annual with a
-- worst-month input; the first cross-stage recharge check; error/not-found
-- boundaries and calculator NaN guards.
--
-- Keep in sync with supabase/seed.sql (CI enforces this).

update public.roadmap_items
  set status = 'in_test',
      dev_percent_complete = 90,
      description = 'Fixed. Regional presets are labelled annual averages, each carries a worst-month companion (Netherlands December 1.0h against 2.5h annual; Australia winter is June), and the panel calculator sizes a band — N panels at the annual figure, M in the worst month — rather than one count that hides the season. A control copies the worst month into the working figure so a beginner can size against December instead of June. The annual numbers themselves did not change. Starting points, not a site assessment: no tilt, no shading, no NASA SSE lookup. Covered by src/lib/__tests__/peak-sun.test.ts. Still blocked on the licensed-electrician sign-off.'
  where title = 'Calculators: peak sun hours are annual averages — say so';

update public.roadmap_items
  set status = 'in_test',
      dev_percent_complete = 90,
      description = 'Fixed. src/lib/recharge.ts compares array output after derate against the energy that must go into the battery to replace the day''s draw. An array sized by the shared efficiency model closes the loop at those sun hours by construction; the same array sized on the Netherlands annual 2.5h covers only 40% of the daily draw at 1h in December. The panel page (and the battery page, once a panel sizing has been published) warn in that case rather than letting two "correct" answers quietly under-charge every day. This is the pattern later cross-stage checks follow; the phase-1 system designer generalises it rather than replacing it. How-it-works no longer says the check is on the roadmap. Covered by src/lib/__tests__/recharge.test.ts. Still blocked on the licensed-electrician sign-off.'
  where title = 'Battery calculator: flag when the panel array can''t recharge the bank in the available sun';

update public.roadmap_items
  set status = 'in_test',
      dev_percent_complete = 90,
      description = 'Fixed for the original findings. src/app/error.tsx and src/app/not-found.tsx exist (Next.js 16 error boundaries, using retry not reset). Panel surplus % is null rather than NaN when dailyKwh is 0. Hours are clamped 0–24, watts ≥ 0, quantity ≥ 1, peak sun 0–12, autonomy 1–14. Remaining: failed label scans still alert() — that route is the separate "Gate /api/scan-label" security item.'
  where title = 'error.tsx, not-found.tsx, and calculator NaN guards';

update public.roadmap_items
  set status = 'in_test',
      dev_percent_complete = 90,
      description = 'Battery sizing shows three selectable scenarios — through the night, one sunless day, and the selected run of sunless days — rounded to a precision the inputs justify, each driving the real-battery counts. Load varies across them rather than being treated as constant. Each appliance carries a profile (all day / daytime / evening / cooling / heating) which separates two independent axes: WHEN a load runs, and HOW weather affects it. The first version conflated them and was cooling-biased — it suppressed "daytime" loads on overcast days, which is right for air conditioning and exactly backwards for heating, since heating runs hardest at night and harder still when it is cold and grey. That was a sign error, not an imprecision, and no page copy could rescue it. Cooling and heating now move the sunless-day load in opposite directions, each with its own adjustable factor rather than a baked-in constant. Because the risks are asymmetric — cooling load is anti-correlated with the shortage and so forgives an undersized bank, while heating is correlated and does not — a heating-dominated system now gets an explicit warning to size against the multi-day figure. The preset list also gained heating appliances; it previously had fourteen ways to cool a house and none to heat one, quietly assuming a warm climate. The load calculator now shows a typical-vs-grey/cold-day band when cooling or heating is on the list (same weather factors the battery scenarios use, rounded to a precision the inputs justify). The panel calculator sizes a band from the annual peak-sun figure to the worst month. Still blocked on the licensed-electrician sign-off.'
  where title = 'Calculators: capacity outputs are ranges, not point estimates';

update public.roadmap_items
  set dev_percent_complete = 90,
      description = 'npm test runs in CI on every PR. 103 tests across eight modules. Added: panel count and surplus-percent NaN guards, peak-sun annual/worst-month contract (published annual figures did not change; NL December is 1h; Australia winter is June), and the recharge-loop check — an array sized by the shared model closes at those sun hours, and the same array fails in a 1h December. Still uncovered: reviewBatteryModel() flags, and anything at the page level — there is no component or end-to-end testing at all.'
  where title = 'Unit tests for calculator math and battery-review';
