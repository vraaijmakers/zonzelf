-- The load, battery and panel calculators now share one efficiency model.
--
-- Keep in sync with supabase/seed.sql (CI enforces this).

update public.roadmap_items
  set status = 'in_test',
      dev_percent_complete = 90,
      description = 'Fixed. src/lib/system-efficiency.ts is now the single definition, and all three pages read from it instead of doing their own arithmetic. The physical chain has three distinct losses, not one: inverter and wiring (DC to AC, 85% default), battery round trip (per chemistry — the field the battery calculator defined and never applied: lithium 97%, AGM/gel 85%, flooded 80%), and array derate (soiling, heat, MPPT, cabling, 80%). A battery bank pays only the inverter, because it is sized by what it hands to the load; an array pays all three, because the energy it generates is stored before it is used. That correction matters: the old panel maths omitted battery round trip entirely and so UNDERSIZED the array — about 3% for lithium, about 25% for flooded lead-acid. The battery calculator publishes its chemistry so the panel page uses the real figure rather than a default. Copy was corrected to match: the load calculator no longer tells users to carry one number into both battery AND panel sizing, the panel page no longer calls its array derate "system efficiency" or claims it includes inverter losses, and the panel page no longer inherits the load calculator''s efficiency as its own. Locked by src/lib/__tests__/system-efficiency.test.ts, which CI now runs — a contract test that CI does not execute is not a contract. Still blocked on the licensed-electrician sign-off before any of this counts as reviewed.'
  where title = 'Calculators: one efficiency model across load / battery / panels';

update public.roadmap_items
  set status = 'in_test',
      dev_percent_complete = 60,
      description = 'npm test now runs in CI on every PR (.github/workflows/ci.yml), so the suite can no longer rot unnoticed. 31 tests across three modules: NEC 310.16 ampacity and the 240.4(D) caps, round-trip voltage drop and the AWG passing-set contract, the appliance duty-cycle model and preset bands, and the shared load/battery/panel efficiency contract. Still uncovered: battery bank sizing beyond the shared helper, the peak-sun and panel-count maths, reviewBatteryModel() flags, and anything at the page level — there is no component or end-to-end testing at all. Playwright can come later.'
  where title = 'Unit tests for calculator math and battery-review';
