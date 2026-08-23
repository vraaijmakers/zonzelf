-- Battery sizing now answers three questions instead of one.
--
-- Keep in sync with supabase/seed.sql (CI enforces this).

update public.roadmap_items
  set status = 'in_development',
      dev_percent_complete = 50,
      description = 'Battery sizing done; load and panels still to do. The battery calculator printed one figure for whatever autonomy was selected, and "1 day of autonomy" reads like "survive the night" while meaning something quite different — a full 24 hours with zero solar input. A normal night needs far less, because the panels refill at sunrise. It now shows three scenarios side by side: through the night, one sunless day, and the selected run of sunless days. At ~32 kWh/day that band runs from roughly 20 kWh to 120 kWh, a 6x spread that a single number was hiding. Figures are rounded to a precision the inputs justify (nearest 0.5 below 10 kWh, nearest 1 below 100, nearest 5 above) rather than carrying a decimal the duty-cycle and efficiency assumptions cannot support. Overnight energy cannot be derived from the load calculator, which records hours per day but never what time of day, so the share is an explicit adjustable input defaulting to the dark-hours proportion, with the assumption stated on the page. Remaining: the load calculator total and the panel array size are still point estimates. Covered by src/lib/__tests__/battery-scenarios.test.ts.'
  where title = 'Calculators: capacity outputs are ranges, not point estimates';

update public.roadmap_items
  set dev_percent_complete = 70,
      description = 'npm test runs in CI on every PR. 42 tests across four modules: NEC 310.16 ampacity and the 240.4(D) caps, round-trip voltage drop and the AWG passing-set contract, the appliance duty-cycle model and preset bands, the shared load/battery/panel efficiency contract, and the battery scenario band. Still uncovered: the panel count and peak-sun maths, reviewBatteryModel() flags, and anything at the page level — there is no component or end-to-end testing at all.'
  where title = 'Unit tests for calculator math and battery-review';
