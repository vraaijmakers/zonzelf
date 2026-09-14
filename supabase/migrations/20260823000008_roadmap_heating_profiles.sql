-- Heating is not cooling reversed. The load-profile model was cooling-biased
-- and computed the wrong direction for heating-dominated systems.
--
-- Keep in sync with supabase/seed.sql (CI enforces this).

update public.roadmap_items
  set dev_percent_complete = 70,
      description = 'Battery sizing shows three selectable scenarios — through the night, one sunless day, and the selected run of sunless days — rounded to a precision the inputs justify, each driving the real-battery counts. Load varies across them rather than being treated as constant. Each appliance carries a profile (all day / daytime / evening / cooling / heating) which separates two independent axes: WHEN a load runs, and HOW weather affects it. The first version conflated them and was cooling-biased — it suppressed "daytime" loads on overcast days, which is right for air conditioning and exactly backwards for heating, since heating runs hardest at night and harder still when it is cold and grey. That was a sign error, not an imprecision, and no page copy could rescue it. Cooling and heating now move the sunless-day load in opposite directions, each with its own adjustable factor rather than a baked-in constant. Because the risks are asymmetric — cooling load is anti-correlated with the shortage and so forgives an undersized bank, while heating is correlated and does not — a heating-dominated system now gets an explicit warning to size against the multi-day figure. The preset list also gained heating appliances; it previously had fourteen ways to cool a house and none to heat one, quietly assuming a warm climate. Remaining for this item: the load calculator total and the panel array size are still point estimates.'
  where title = 'Calculators: capacity outputs are ranges, not point estimates';

update public.roadmap_items
  set dev_percent_complete = 80,
      description = 'npm test runs in CI on every PR. 63 tests across four modules, including that heating increases the sunless-day load while cooling decreases it, that the cold factor can never behave like suppression, that a heating-dominated load is flagged as correlated risk while a cooling-dominated one is not, and that a summary saved before cooling and heating were distinct classes still loads. Still uncovered: the panel count and peak-sun maths, reviewBatteryModel() flags, and anything at the page level — there is no component or end-to-end testing, which is how several UI regressions this session reached a human reviewer rather than a test.'
  where title = 'Unit tests for calculator math and battery-review';
