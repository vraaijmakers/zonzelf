-- Load is no longer treated as constant across the battery scenarios.
--
-- Keep in sync with supabase/seed.sql (CI enforces this).

update public.roadmap_items
  set dev_percent_complete = 60,
      description = 'Battery sizing shows three scenarios — through the night, one sunless day, and the selected run of sunless days — rounded to a precision the inputs justify. Each is selectable and drives the real-battery counts, so "how many batteries just to get through the night" can now be asked; previously the list silently answered the autonomy-days case only. Load is no longer treated as constant across those scenarios, which was wrong in two directions at once for a cooling-dominated system: air conditioning barely runs overnight, and a sunless day is sunless BECAUSE it is overcast, which means cooler, which means the cooling load collapses — the shortage and the load are anti-correlated. Each appliance now carries a profile (all day / daytime / evening); the overnight share is derived from it rather than assumed flat, and the weather-driven fraction drives an adjustable overcast factor. Both flaws were found by using the tool, not by the tests. Remaining for this item: the load calculator total and the panel array size are still point estimates.'
  where title = 'Calculators: capacity outputs are ranges, not point estimates';

update public.roadmap_items
  set dev_percent_complete = 75,
      description = 'npm test runs in CI on every PR. 54 tests across four modules: NEC 310.16 ampacity and the 240.4(D) caps, round-trip voltage drop and the AWG passing-set contract, the appliance duty-cycle model, preset bands and load profiles, the shared load/battery/panel efficiency contract, and the battery scenario band including weather-driven load suppression. Still uncovered: the panel count and peak-sun maths, reviewBatteryModel() flags, and anything at the page level — there is no component or end-to-end testing, which is how three UI regressions (a truncated column, a clipped action button, a stale-data path) reached a human reviewer rather than a test.'
  where title = 'Unit tests for calculator math and battery-review';
